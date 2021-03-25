// HDWalletProvider to inject our seed phrase and the rinkeby infura node
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const path = require("path");

// file stream
const fs = require("fs");

// path to our landmark factory
const landmarkFactoryPath = path.resolve(
  __dirname,
  "artifacts",
  "contracts",
  "Landmark.sol",
  "LandmarkFactory.json"
);

// compiled landmark factory
const compiledLandmark = fs.readFileSync(landmarkFactoryPath, "utf8");

// Set up a Truffle provider and include our mnemonic phrase
// along with the rinkeby infura node ..
const truffleProvider = new HDWalletProvider(
  "crew express nothing company wet enforce rural pioneer surround evidence trigger file",
  "https://rinkeby.infura.io/v3/877a59f4a10342a5aff775080ec9fc06"
);

// .. and inject it into web3
const web3 = new Web3(truffleProvider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();
  console.log("Attempting to deploy from account", accounts[0]);

  // we only need to deploy Landmark Factory. since Landmark
  // already inherits  from TerraCoin, anytime we create a
  // Landmark from the Landmark Factory, we also create it's
  //  own TC implementation.
  const landmarkFactory = await new web3.eth.Contract(JSON.parse(compiledLandmark).abi)
    .deploy({ data: JSON.parse(compiledLandmark).bytecode })
    .send({ from: accounts[0], gas: "3000000" })
    .catch(err => console.log(err));
  console.log("contract deployed to: ", landmarkFactory.options.address);
};
deploy();
// address of deployment: 0xb905A2506C66F288af71395231A61AAAa4C44984