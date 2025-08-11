import { ethers } from "hardhat";

async function main() {
  const Escrow = await ethers.getContractFactory("EscrowMilestones");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log("EscrowMilestones déployé à:", address);

  const nextId = await (escrow as any).nextId();
  console.log("nextId:", nextId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
