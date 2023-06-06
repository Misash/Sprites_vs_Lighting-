const { ethers } = require("hardhat");
const fs = require('fs');


const SpriteNetwork = require('./SpriteNetWork.js');

const delta  = require("./constants.js") // On-chain time mining delay


async function main() {


    // Desplegar el contrato PreimageManager
    const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
    const preimageManager = await PreimageManager.deploy();
    await preimageManager.deployed();

    // Obtener una instancia existente del contrato PreimageManager
    const preimageManagerAddress = preimageManager.address; // Dirección del contrato PreimageManager existente
    const Global_PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);



    spriteNet = new SpriteNetwork(Global_PM);

    //get accounts
    const players = await ethers.getSigners();
    console.log("Generated accounts:");
    console.log(players.length);


    // for (const player of players) {
    //     const balance = await player.getBalance();
    //     // console.log(`Player: ${player.address}`);
    //     console.log(`Balance: ${ethers.utils.formatEther(balance)}`); // Convert balance from wei to ether
    // }


    //read DataSet
    const readData = fs.readFileSync('./Datasets/LinkedNet.json', 'utf8');
    const dataset = JSON.parse(readData);

    console.log("channels: ", dataset.length);


    //create channels
    let channels = [];
    for( data of dataset){
        console.log("channel: ", data);
        sender = players[data.players[0]];
        recipient = players[data.players[1]];
        channels.push( await spriteNet.createChannel([sender, recipient], data.weights)); 
    }



    //print the channels
    spriteNet.channels.printTable();


    //Find path to make a transaction with linked Channels
    let toSend = 5;
    let path = await spriteNet.findShortestPathWithCapacity(players[0].address, players[49].address, toSend);
    if (path.length > 0) {
        console.log("Camino encontrado:");
        for (const chunk of path) {
            console.log(`${chunk.sender} -> ${chunk.recipient}`);
        }
    } else {
        console.log("No se encontró un camino con suficiente capacidad.");
    }



    //get current info of the blokchain
    let currentBlock = await ethers.provider.getBlockNumber();
    let deadline = currentBlock + delta;
    console.log("currentBlock: ", currentBlock);
    console.log("deadline: ", deadline);


    //petty attack
    petty_rate = 0.9;
    malicious = Math.round(path.length*petty_rate);
    no_malicious = path.length - malicious;
  
    const startTime = performance.now();

    //make the transactions O(1)
    for (let i = 0; i < no_malicious; i++) {
        chunk = path[i];
        await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
    }

    //petty attack -> delta time to reveal the preimage
    for (let i = currentBlock; i < deadline; i++) {
        if (i == deadline - 1) {
            for (let i = no_malicious; i < path.length; i++) {
                chunk = path[i];
                await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
            }
        }
        await network.provider.send("evm_mine");
    }
    //end transactions

    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    console.log(`Tiempo transcurrido: ${elapsedTime} ms`);



    //close the channel
    // await channel.close();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
