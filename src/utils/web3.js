import Web3 from "web3";

let web3;

if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
        window.ethereum.enable(); // Ζητά άδεια από τον χρήστη για χρήση του Metamask
    } catch (error) {
        console.error("User denied account access");
    }
} else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
} else {
    console.warn("No Ethereum browser detected. You should consider trying MetaMask!");
    web3 = new Web3(new Web3.providers.HttpProvider("https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"));
}

export default web3;
