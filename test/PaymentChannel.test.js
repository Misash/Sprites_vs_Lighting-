// SPDX-License-Identifier: UNLICENSED
const { expect } = require("chai");


describe("PaymentChannel", function () {
  let PaymentChannel;
  let paymentChannel;
  let players;

  beforeEach(async function () {
    PaymentChannel = await ethers.getContractFactory("PaymentChannel");
    players = await ethers.getSigners();
    paymentChannel = await PaymentChannel.deploy([players[0].address, players[1].address]);
    await paymentChannel.deployed();
  });
  

  it("should initialize the contract correctly", async function () {
    expect(await paymentChannel.players(0)).to.equal(players[0].address);
    expect(await paymentChannel.players(1)).to.equal(players[1].address);
    expect(await paymentChannel.bestRound()).to.equal(-1);
    expect(await paymentChannel.status()).to.equal(0);
  });

  it("should deposit funds correctly", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    await paymentChannel.connect(players[0]).deposit({ value: depositAmount });
    expect(await paymentChannel.deposits(0)).to.equal(depositAmount);

    await paymentChannel.connect(players[1]).deposit({ value: depositAmount });
    expect(await paymentChannel.deposits(1)).to.equal(depositAmount);
  });

  it("should withdraw funds correctly", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const withdrawAmount = ethers.utils.parseEther("0.5");

    // deposit first time 1 eth
    await paymentChannel.connect(players[0]).deposit({ value: depositAmount });
    // withdraw all your eth
    await paymentChannel.connect(players[0]).withdraw();
    expect(await paymentChannel.withdrawals(0)).to.equal(depositAmount);

    //deposit again 0.5
    await paymentChannel.connect(players[0]).deposit({ value: withdrawAmount });
    //get total withdrawn
    await paymentChannel.connect(players[0]).withdraw();
    expect(await paymentChannel.withdrawn(0)).to.equal(withdrawAmount.add(depositAmount));
  });

  it("should update the channel correctly", async function () {
    const currentRound = 0;
    const credits = [10, 20];
    const withdrawals = [5, 10];
  
    // Generar la firma válida utilizando ethers.js
    const messageHash = ethers.utils.solidityKeccak256(
      ["int", "int[2]", "uint[2]"],
      [currentRound, credits, withdrawals]
    );
    const messageHashBytes = ethers.utils.arrayify(messageHash);
    const signature = await players[0].signMessage(messageHashBytes);
    const { v, r, s } = ethers.utils.splitSignature(signature);
      

    // await paymentChannel.deposit({ value: depositAmount });
    
    await paymentChannel.connect(players[1]).update(
      [v, r, s], // Pasar la firma válida generada
      currentRound,
      credits,
      withdrawals
    );
  
    // expect(await paymentChannel.bestRound()).to.equal(currentRound);
    // expect(await paymentChannel.credits(0)).to.equal(credits[0]);
    // expect(await paymentChannel.credits(1)).to.equal(credits[1]);
    // expect(await paymentChannel.withdrawals(0)).to.equal(withdrawals[0]);
    // expect(await paymentChannel.withdrawals(1)).to.equal(withdrawals[1]);
  });
  

  // it("should finalize the channel correctly", async function () {
  //   const depositAmount = ethers.utils.parseEther("1");

  //   await paymentChannel.connect(players[0]).deposit({ value: depositAmount });
  //   await paymentChannel.connect(players[1]).deposit({ value: depositAmount });

  //   await paymentChannel.trigger();
  //   expect(await paymentChannel.status()).to.equal(1);

  //   // Fast-forward the blocks to reach the deadline
  //   await network.provider.send("evm_increaseTime", [11]);
  //   await network.provider.send("evm_mine");

  //   await paymentChannel.finalize();
  //   expect(await paymentChannel.status()).to.equal(0);
  //   expect(await paymentChannel.credits(0)).to.equal(-depositAmount);
  //   expect(await paymentChannel.credits(1)).to.equal(-depositAmount);
  //   expect(await paymentChannel.withdrawals(0)).to.equal(
  //     depositAmount.mul(2)
  //   );
  //   expect(await paymentChannel.withdrawals(1)).to.equal(
  //     depositAmount.mul(2)
  //   );
  // });


});
