const { ethers } = require("hardhat");
const fs = require('fs');

const HashTable = require('./utils/HashTable.js');

const delta  = require("./constants.js") // On-chain time mining delay




class LightningChannelContainer {

    constructor(_players, _addressChannel, _PM) {
        this.addressChannel = _addressChannel;
        this.PM = _PM;
        this.player1 = _players[0];
        this.player2 = _players[1];
    }

    //get total amount of money of the party
    getBalance(address) {
        return this.addressChannel.getBalance(address);
    }

    //get the address of the recipient
    getAddressRecipient(address) {
        return this.addressChannel.getAddressRecipient(address);
    }

    //get index of the party
    getIndex(address) {
        return this.addressChannel.getIndex(address);
    }

    getPlayer(address) {
        return address === this.player1.address ? this.player1 : this.player2;
    }

    getLastRound() {
        return this.addressChannel.getRound();
    }


    //make a transaction
    async makeTransaction(senderAddress, recipientAdress, coins) {

        let sender = this.getPlayer(senderAddress);
        let recipient = this.getPlayer(recipientAdress);

        if (this.getBalance(sender.address) < coins) {
            throw new Error("Not enough money");
        }


        //sender send the preImage to the PM
        let Round = await this.getLastRound() + 1;
        let amount = ethers.utils.parseEther(coins);
        // let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret"));
        let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret" + Date.now()));
        let indexSender = await this.getIndex(sender.address);
        let indexRecipient = indexSender == 0 ? 1 : 0;
        let direction = [indexSender, indexRecipient]; // sender -> recipient

        // console.log("Round: ", Round);
        // console.log("amount: ", amount);
        // console.log("hash: ", hash);
        console.log("direction: ", direction);
        console.log("indexSender: ", indexSender);
        console.log("indexRecipient: ", indexRecipient);

        // Generate the singature
        const messageHash = ethers.utils.solidityKeccak256(
            ["uint", "bytes32", "int[2]", "uint"],
            [Round, hash, direction, amount]
        );

        let currentBlock = await ethers.provider.getBlockNumber();
        let deadline = currentBlock + delta;
        console.log("currentBlock: ", currentBlock);
        console.log("deadline: ", deadline);


        for (let i = currentBlock; i < deadline; i++) {
            //petty attack -> delta time to reveal the preimage
            if (i == deadline - 1) {
                //sender send the preimage with 
                let currentBlock = await this.PM.connect(sender).submitPreimage(messageHash);
                let deadline = currentBlock.blockNumber + delta;
                console.log("currentBlock: ", currentBlock.blockNumber);
                console.log("deadline: ", deadline);
            }
            await network.provider.send("evm_mine");
        }


        // //recipient has delta time to reveal the preimage
        let revealPreimage = await this.PM.connect(recipient).revealPreimage(messageHash);

        if (revealPreimage) {
            console.log("Recipient reveleaded the preimage before the deadline");
            //actualizar el estado del channel
            await this.addressChannel.connect(sender).update(Round, hash, direction, amount);
            console.log("Channel updated");
        } else {
            console.log("ERROR: Recipient not reveleaded the preimage before the deadline");
        }

    }


    //close the channel
    async close() {
        await this.addressChannel.finalize();
    }


}


class LightningNetwork {

    //channels adress -> channel
    channels = new HashTable();


    //nodos
    constructor() {
        console.log("Network created");
    }


    removeNode(adressPlayer) {
        this.nodes.remove(adressPlayer);
    }

    async createChannel([player1, player2], [coins1, coins2]) {

        const players = [player1, player2]

        console.log("player1: ", player1.address);
        console.log("player2: ", player2.address);

        // deploy a contract on the network
        const ConditionalChannel = await ethers.getContractFactory("ConditionalChannel");
        const conditionalChannel = await ConditionalChannel.deploy([player1.address, player2.address]);
        await conditionalChannel.deployed();

        // Make a deposit in the channel for both parties
        await conditionalChannel.connect(player1).deposit({ value: ethers.utils.parseEther(coins1) }); //strings
        await conditionalChannel.connect(player2).deposit({ value: ethers.utils.parseEther(coins2) });

        //create a lightning channel with Local PreimageManager
        const channel = new LightningChannelContainer(players, conditionalChannel, await this.getPM());


        // add the bidirectional channel to the network
        this.channels.set(player1.address, channel);
        this.channels.set(player2.address, channel);


        console.log("Channel created: ", conditionalChannel.address);
        return channel;
    }


    async findShortestPathWithCapacity(start, target, requiredCapacity) {

        //BFS
        const capacities = {};
        const previous = {};
        const queue = [];
        queue.push(start);
        capacities[start] = Infinity;

        while (queue.length > 0) {

            //save and delete the first element of the queue
            const vertex = queue.shift();

            if (vertex === target && capacities[vertex] >= requiredCapacity) {
                // plath found
                const path = [];
                let current = previous[target];
                while (current.sender !== start) {
                    path.unshift(current);
                    current = previous[current.sender];
                }
                path.unshift(current);
                return path;
            }

            for (const ch of this.channels.get(vertex)) {
                //get the neighbor
                const recipient = await ch.getAddressRecipient(vertex);
                //how much money can be sent
                const newCapacity = Math.min(capacities[vertex], await ch.getBalance(vertex));
                //if the neighbor has more capacity than the current one or not exists
                if (!capacities[recipient] || newCapacity > capacities[recipient]) {
                    capacities[recipient] = newCapacity;
                    let chunk = { sender: vertex, recipient: recipient, amount: requiredCapacity, channel: ch };
                    previous[recipient] = chunk;
                    queue.push(recipient);
                }
            }
         
        }

        return [];
    }


    async getAccounts(n) {
        const accounts = [];
        const players = await ethers.getSigners();

        for (let i = 0; i < n; i++) {
            accounts.push(players[i]);
        }

        return accounts;
    }


    async getPM() {
        const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
        const preimageManager = await PreimageManager.deploy();
        await preimageManager.deployed();

        const preimageManagerAddress = preimageManager.address;
        const PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);
        return PM;
    }


}






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
    for( data of dataset){
        console.log("channel: ", data);
        sender = players[data.players[0]];
        recipient = players[data.players[1]];
        channels.push( await lightningNet.createChannel([sender, recipient], data.weights)); 
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



    const startTime = performance.now();

    //Make many transactions
    for (let chunk of path) {
        await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
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
