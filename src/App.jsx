import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import Voting from ".Voting.json";

const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState("");
  const [voteIndex, setVoteIndex] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });

          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const contractAddress = new ethers.Contract(
            contractAddress,
            Voting.abi,
            signer
          );

          setProvider(provider);
          setSigner(signer);
          setContract(contract);

          loadCandidates(contract);
        } catch (error) {
          console.error("Error connecting to MetaMask:", error);
        }
      } else {
        console.error("MetaMask is not installed");
      }
    };
    init();
  }, []);

  const loadCandidates = async (contract) => {
    const candidatesCount = await contract.candidatesCount();
    let condidatesArray = [];
    for (let i = 0; i < candidatesCount; i++) {
      let candidate = await contract.candidates(i);
      candidatesArray.push(candidate);
    }
    setCandidates(candidatesArray);
  };

  const addCandidate = async () => {
    if (!newCandidate) return;
    const tx = await contract.addCandidate(newCandidate);
    await tx.wait();
    loadCandidates(contract);
    setNewCandidate("");
  };

  const vote = async () => {
    if (voteIndex === "") return;
    const tx = await contract.vote(voteIndex);
    await tx.wait();
    loadCandidates(contract);
    setVoteIndex("");
  };

  return <div>App</div>;
}
