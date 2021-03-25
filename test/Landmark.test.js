const assert = require("assert");

// ganache is used for our local test network
const ganache = require("ganache-cli");
const Web3 = require("web3");

// we iss
const ganacheProvider = ganache.provider();
const web3 = new Web3(ganacheProvider);

const path = require("path");
const landmarkPath = path.resolve(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "Landmark.sol",
  "Landmark.json"
);

const landmarkFactoryPath = path.resolve(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "Landmark.sol",
  "LandmarkFactory.json"
);

const terraCoinPath = path.resolve(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "Landmark.sol",
  "TerraCoin.json"
);

// file stream reader to read the JSON paths of both the
// landmark factory and the landmark
const fs = require("fs");
const compiledFactory = fs.readFileSync(landmarkFactoryPath, "utf8");
const compiledLandmark = fs.readFileSync(landmarkPath, "utf8");
const compiledTerraCoin = fs.readFileSync(terraCoinPath, "utf8");

// accounts from ganache
let accounts;

// campaign address after we create it from factory
let landmarkAddress;

// terraCoin address
let terraCoin;

let factory;
let landmark;

// before we begin our tests, we need to deploy our landmark factory
// and our first landmark.
beforeEach(async () => {
  // get all ganache accounts
  accounts = await web3.eth.getAccounts();

  // creating the landmark factory to create other landmarks
  factory = await new web3.eth.Contract(JSON.parse(compiledFactory).abi)
    .deploy({ data: JSON.parse(compiledFactory).bytecode })
    .send({
      from: accounts[0],
      gas: "5555555",
    });

  // create our first landmark using the factory
  await factory.methods
    .createLandmark(
      "Parc de la Fontaine",
      "[45.5271, -73.5695]",
      "3819 Avenue Calixa-Lavallée, Montréal, QC H2L 3A7",
      1
    )
    .send({
      from: accounts[0],
      gas: "5555555",
    });

  // get our landmark address ..
  const landmarkAddresses = await factory.methods.landmarks().call();
  landmarkAddress = landmarkAddresses[0];

  // .. and deploy it
  landmark = await new web3.eth.Contract(
    JSON.parse(compiledLandmark).abi,
    landmarkAddress
  );

  // deploy our coin with the total supply deposited to accounts[0]
  terraCoin = await new web3.eth.Contract(JSON.parse(compiledTerraCoin).abi)
    .deploy({ data: JSON.parse(compiledTerraCoin).bytecode })
    .send({
      from: accounts[0],
      gas: "5555555",
    });

  // increase allowance of the account manager so that we test sending coins
  // around the tests
  await terraCoin.methods.increaseAllowance(accounts[0], 10).send({
    from: accounts[0],
    gas: "5555555",
  });
});

// BEGIN TESTS
describe("Landmark test", () => {
  it("deploys a factory", () => {
    assert.ok(factory.options.address);
  });
  it("adds a landmark", () => {
    assert.ok(landmark.options.address);
  });
  it("landmark owner is landmark creator", async () => {
    const manager = await landmark.methods.manager().call();
    assert.equal(manager, accounts[0]);
  });
  it("only owner can return summary of landamrk", async () => {
    // check if we can get summary information from manager
    const summary = await landmark.methods
      .returnSummary()
      .call({ from: accounts[0] });
    assert(summary["0"]);
  });
  it("deploys terraCoin", async () => {
    assert.ok(terraCoin.options.address);
    const totalSupply = await terraCoin.methods.totalSupply().call();
    assert.equal(totalSupply, 1000);
  });
  it("check if owner's balance is 1000", async () => {
    const balance = await terraCoin.methods.balanceOf(accounts[0]).call();
    assert.equal(balance, 1000);
  });
  it("check allowance of manager is 10", async () => {
    const allowance = await terraCoin.methods
      .allowance(accounts[0], accounts[0])
      .call();
    assert.equal(allowance, 10);
  });
  it("increase allowance of manager by 10", async () => {
    await terraCoin.methods.increaseAllowance(accounts[0], 10).send({
      from: accounts[0],
      gas: "5555555",
    });
    const allowance = await terraCoin.methods
      .allowance(accounts[0], accounts[0])
      .call();
    assert.equal(allowance, 20);
  });
  it("can transfer 1 TC from owner to another account", async () => {
    await terraCoin.methods
      .transfer(accounts[1], 1)
      .send({ from: accounts[0], gas: "5555555" });
    // call and check account balance is = 1
    const accountBalance = await terraCoin.methods
      .balanceOf(accounts[1])
      .call();
    assert.equal(accountBalance, 1);
  });
  it("can scan a landmark", async () => {
    const summary = await landmark.methods
      .returnSummary()
      .call({ from: accounts[0] });
    await landmark.methods
      .scanLandmark(
        summary["0"],
        summary["1"],
        summary["2"],
        parseInt(summary["3"]),
        parseInt(summary["4"])
      )
      .send({ from: accounts[1], gas: "5555555" })
      .then(async () => {
        // after the user scans the landmark, the manager can send the user
        // 1 token.
        await terraCoin.methods
          .transfer(accounts[1], 1)
          .send({ from: accounts[0], gas: "5555555" });

        // call the balance of the user who scanned the landmark
        const accountBalance = await terraCoin.methods
          .balanceOf(accounts[1])
          .call();

        // check if the user now has 1 extra coin in his account
        assert.equal(accountBalance, 1);

        // check the address of who discovered this landmark is equal to the
        // account calling the method
        const address = await landmark.methods.usersDiscovered(0).call();
        assert.equal(address, accounts[1]);
      });
  });
});
