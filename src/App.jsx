import { useEffect, useState } from "react";
import { ethers } from "ethers";
import VotingAbi from "./Voting.json";
import { create } from "ipfs-http-client";
import { Buffer } from "buffer";

const ipfs = create({ url: "http://localhost:5001" });

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  const [account, setAccount] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [voteId, setVoteId] = useState(0);
  const [newCandidate, setNewCandidate] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const getContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signer);
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Veuillez installer MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    console.log("Adresse récupérée :", address);
    setAccount(address);
    const contract = await getContract();
    const owner = await contract.owner();
    setIsOwner(address.toLowerCase() === owner.toLowerCase());
  };

  const loadCandidates = async () => {
    const contract = await getContract();
    const count = await contract.candidatesCount();
    const list = [];
    for (let i = 0; i < count; i++) {
      const c = await contract.candidates(i);
      list.push({
        id: i,
        name: c.name,
        voteCount: c.voteCount.toString(),
        imageCID: c.imageCID,
      });
    }
    setCandidates(list);
  };

  const vote = async () => {
    const contract = await getContract();
    const tx = await contract.vote(voteId);
    await tx.wait();
    loadCandidates();
  };

  const addCandidate = async () => {
    if (!newCandidate.trim() || !imageFile) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        if (!reader.result) throw new Error("Erreur lecture fichier");

        // Convertir ArrayBuffer en Uint8Array
        const uint8Array = new Uint8Array(reader.result);

        // Ajout sur IPFS
        const result = await ipfs.add(uint8Array);
        console.log("Résultat IPFS :", result);

        const imageCID = result.path;

        // Copier dans MFS pour le voir dans l'interface IPFS
        const mfsPath = `/images/${imageCID}`;
        try {
          // Créer le dossier /images s'il n'existe pas (ignore l'erreur sinon)
          await ipfs.files.mkdir("/images", { parents: true });
        } catch (err) {
          // dossier existe peut-être déjà, on ignore l'erreur
        }
        // Copier le fichier dans MFS
        await ipfs.files.cp(`/ipfs/${imageCID}`, mfsPath);

        console.log(`Fichier copié dans MFS à : ${mfsPath}`);

        const contract = await getContract();
        const tx = await contract.addCandidate(newCandidate.trim(), imageCID);
        await tx.wait();

        setNewCandidate("");
        setImageFile(null);
        loadCandidates();
      } catch (err) {
        console.error("Erreur addCandidate:", err);
      }
    };
    reader.readAsArrayBuffer(imageFile);
  };

  useEffect(() => {
    connectWallet();
    loadCandidates();
  }, []);

  return (
    <div className="App" style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>DApp de Vote</h1>
      <p>
        Connecté en tant que : <strong>{account}</strong>
      </p>
      {isOwner && (
        <div style={{ marginBottom: "20px" }}>
          <h3>Ajouter un candidat</h3>
          <input
            type="text"
            value={newCandidate}
            onChange={(e) => setNewCandidate(e.target.value)}
            placeholder="Nom du candidat"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
          <button onClick={addCandidate}>Ajouter</button>
        </div>
      )}
      <ul>
        {candidates.map((c) => (
          <li key={c.id}>
            {c.name} : {c.voteCount} vote(s)
            <br />
            {c.imageCID && (
              <img
                src={`http://127.0.0.1:8080/ipfs/${c.imageCID}`}
                alt={c.name}
                width="100"
                style={{ marginTop: "10px" }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
