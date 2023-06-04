const { ethers } = require("hardhat");
const delta = 10; // Número de bloques para que expire el hash
const HashTable = require('./HashTable.js');



class Channel {

    constructor(_players,_addressChannel, _PM) {
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

    getLastRound(){
        return this.addressChannel.getRound();
    }


    //make a transaction
    async makeTransaction(sender, recipient, coins) {
        if (this.getBalance(sender.address) < coins) {
            throw new Error("Not enough money");
        }

        //sender send the preImage to the PM
        let Round = await this.getLastRound() + 1;
        let amount = ethers.utils.parseEther(coins);
        let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret"));
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

        //sender send the preimage with 
        let currentBlock = await this.PM.connect(sender).submitPreimage(messageHash);
        let deadline = currentBlock.blockNumber + delta;
        console.log("currentBlock: ", currentBlock.blockNumber);
        console.log("deadline: ", deadline);


        // //recipient has delta time to reveal the preimage
        let revealPreimage = await this.PM.connect(recipient).revealPreimage(messageHash);

        if (revealPreimage) {
            console.log("Recipient SI revelo el preimage antes del deadline");
            //actualizar el estado del channel
            await this.addressChannel.update(Round, hash, direction, amount);
        } else {
            console.log("Recipient No revelo el preimage antes del deadline!!!!");
        }
        
    }

    //close the channel
    async close() {
        await this.addressChannel.finalize();
    }


}


class Network {

    //channels adress -> channel
    channels = new HashTable();

    //Global PreimageManager
    GPM = null;

    //nodos
    constructor(_GPM) {
        this.GPM = _GPM;
        console.log("Network created");
    }


    removeNode(adressPlayer) {
        this.nodes.remove(adressPlayer);
    }

    async createChannel([coins1, coins2]) {

        // get accounts from the contract
        const players = await ethers.getSigners();
        const [player1, player2] = players;

        // deploy a contract on the network
        const SpriteChannel = await ethers.getContractFactory("ConditionalChannel");
        const spriteChannel = await SpriteChannel.deploy([player1.address, player2.address]);
        await spriteChannel.deployed();

        // Make a deposit in the channel for both parties
        await spriteChannel.connect(player1).deposit({ value: ethers.utils.parseEther(coins1) }); //strings
        await spriteChannel.connect(player2).deposit({ value: ethers.utils.parseEther(coins2) });

        //create channel instance
        const channel = new Channel(players,spriteChannel, this.GPM);

        // add the bidirectional channel to the network
        this.channels.set(player1.address, spriteChannel);
        this.channels.set(player2.address, spriteChannel);

        console.log("Channel created: ", spriteChannel.address);

        return channel;
    }




}



async function main() {


    // Desplegar el contrato PreimageManager
    const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
    const preimageManager = await PreimageManager.deploy();
    await preimageManager.deployed();


    // Obtener una instancia existente del contrato PreimageManager
    const preimageManagerAddress = preimageManager.address; // Dirección del contrato PreimageManager existente
    const Global_PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);


    net = new Network(Global_PM);


    channel = await net.createChannel( ["10","10"]);

    //Make many transactions
    await channel.makeTransaction(channel.player2, channel.player1, "5");
    await channel.makeTransaction(channel.player1, channel.player2, "2");

    //close the channel
    await channel.close();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
