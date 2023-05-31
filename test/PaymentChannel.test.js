
const { assert, expect } = require("chai");
const { ethers } = require("hardhat");

//framework mocha

describe("PaymentChannel", function () {
  let paymentChannel;
  let player1;
  let player2;

  //deploy first
  beforeEach(async function () {
    const PaymentChannel = await ethers.getContractFactory("PaymentChannel");
    [player1, player2] = await ethers.getSigners();
    //constructor
    paymentChannel = await PaymentChannel.deploy([player1.address, player2.address]);
    await paymentChannel.deployed();
    console.log("PaymentChannel deployed at:", paymentChannel.address);
  });

  // //access to the public getters
  // it("should initialize the contract correctly", async function () {
  //   expect(await paymentChannel.bestRound()).to.equal(-1); 
  //   expect(await paymentChannel.status()).to.equal(0);
  // });

  // it("should deposit funds to the payment channel", async function () {
  //   const initialDeposit = ethers.utils.parseEther("1"); // 1 eth = 10^18 wei
  //   await paymentChannel.connect(player1).deposit({ value: initialDeposit });
  //   //verified deposits[0] = initialDeposit
  //   expect(await paymentChannel.deposits(0)).to.equal(initialDeposit);
  // });




  it("should update the payment channel state", async function () {
    // const sig = [0, "0x", "0x"];
    const sig = [
      0, 
      "0x0000000000000000000000000000000000000000000000000000000000000000",
     "0x0000000000000000000000000000000000000000000000000000000000000000"];

    const r = 1;
    const credits = [10, 20];
    const withdrawals = [5, 10];
    await paymentChannel.connect(player1).update(sig, r, credits, withdrawals);

    const logDebugEventFilter = paymentChannel.filters.LogDebug();
    paymentChannel.on(logDebugEventFilter, (i, _h, V, R, S) => {
      console.log("i: ", i.toNumber());
      console.log("_h: ", _h.toString());
      console.log("V: ", V.toNumber());
      console.log("R: ", R.toString());
      console.log("S: ", S.toString());
    });

    expect(await paymentChannel.bestRound()).to.equal(r);
    expect(await paymentChannel.credits(0)).to.equal(credits[0]);
    expect(await paymentChannel.credits(1)).to.equal(credits[1]);
    expect(await paymentChannel.withdrawals(0)).to.equal(withdrawals[0]);
    expect(await paymentChannel.withdrawals(1)).to.equal(withdrawals[1]);
  });

  // Add more test cases as needed

});
