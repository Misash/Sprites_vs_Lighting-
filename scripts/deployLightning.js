const { ethers } = require("hardhat");
const fs = require('fs');

const LightningNetwork = require('./LightningNetwork.js');

async function main() {


    lightningNet = new LightningNetwork();

    //get accounts
    const players = await ethers.getSigners();
    console.log("Generated accounts:");
    console.log(players.length);


    //read DataSet
    const readData = fs.readFileSync('./Datasets/LinkedNet.json', 'utf8');
    const dataset = JSON.parse(readData);

    console.log("channels: ", dataset.length);

    //create channels
    let channels = [];
    for (data of dataset) {
        console.log("channel: ", data);
        sender = players[data.players[0]];
        recipient = players[data.players[1]];
        channels.push(await lightningNet.createChannel([sender, recipient], data.weights));
    }


    lightningNet.channels.printTable();

    //Find path to make a transaction with linked Channels
    let toSend = 5;
    //some user want to make a transaction in linkedChannels
    let path = await lightningNet.findShortestPathWithCapacity(players[0].address, players[49].address, toSend);
    if (path.length > 0) {
        console.log("Camino encontrado:");
        for (const chunk of path) {
            console.log(`${chunk.sender} -> ${chunk.recipient}`);
        }
    } else {
        console.log("No se encontró un camino con suficiente capacidad.");
    }

    //petty attack
    petty_rate = 0.9;
    malicious = Math.round(path.length * petty_rate);
    no_malicious = path.length - malicious;



    const startTime = performance.now();

    //make the transactions O(1)
    for (let i = 0; i < no_malicious; i++) {
        chunk = path[i];
        await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString(), false);
    }

    //petty attack -> delta time to reveal the preimage O(l*delta)
    for (let i = no_malicious; i < path.length; i++) {
        chunk = path[i];
        await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString(), true);
    }

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
