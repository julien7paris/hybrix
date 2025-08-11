// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EscrowMilestones {
    struct Deal {
        address client;
        address talent;
        uint256 amount;
        bool funded;
        bool released;
    }

    mapping(uint256 => Deal) public deals;
    uint256 public nextId;

    event DealCreated(uint256 id, address client, address talent, uint256 amount);
    event Funded(uint256 id, address from, uint256 amount);
    event Released(uint256 id, address to, uint256 amount);

    function createDeal(address talent, uint256 amount) external returns (uint256 id) {
        id = nextId++;
        deals[id] = Deal(msg.sender, talent, amount, false, false);
        emit DealCreated(id, msg.sender, talent, amount);
    }

    function fundDeal(uint256 id) external payable {
        Deal storage d = deals[id];
        require(msg.sender == d.client, "only client");
        require(!d.funded, "funded");
        require(msg.value == d.amount, "amount");
        d.funded = true;
        emit Funded(id, msg.sender, msg.value);
    }

    function release(uint256 id) external {
        Deal storage d = deals[id];
        require(msg.sender == d.client, "only client");
        require(d.funded && !d.released, "state");
        d.released = true;
        (bool ok, ) = d.talent.call{value: d.amount}("");
        require(ok, "transfer");
        emit Released(id, d.talent, d.amount);
    }
}