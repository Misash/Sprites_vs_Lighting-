const { ethers } = require("hardhat");

async function main() {
  // Deploy the PreimageManager contract
  const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
  const preimageManager = await PreimageManager.deploy();
  await preimageManager.deployed();

  // Generate a preimage and its hash
  const preimage = "Hello World";
  const preimageHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["string"], [preimage]));

  // Set the timestamp limit
  const timestampThreshold = await ethers.provider.getBlockNumber() + 10; // Set a threshold 10 blocks into the future

  // Submit the preimage
  await preimageManager.submitPreimage(preimageHash);
  console.log("Preimage Submitted:", preimageHash);

  // Check if the timestamp is set
  const storedTimestamp = await preimageManager.getTimestamp(preimageHash);
  console.log("Stored Timestamp:", storedTimestamp);

  // Check if the preimage was revealed before the timestamp threshold
  const revealedBefore = await preimageManager.revealedBefore(preimageHash, timestampThreshold);
  console.log("Revealed Before:", revealedBefore);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
