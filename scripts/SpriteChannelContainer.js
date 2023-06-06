
const delta  = require("./constants.js") // On-chain time mining delay


class SpriteChannelContainer {

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

        //sender send the preimage with 
        let currentBlock = await this.PM.connect(sender).submitPreimage(messageHash);
        let deadline = currentBlock.blockNumber + delta;
        console.log("currentBlock: ", currentBlock.blockNumber);
        console.log("deadline: ", deadline);


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





module.exports = SpriteChannelContainer 