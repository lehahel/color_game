// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ColorGame {
    uint public constant gridSize = 10;
    
    struct Cell {
        uint8 color;
        uint lastPaintTime;
        address painter;
    }

    Cell[gridSize][gridSize] public grid;
    uint public paintPrice = 0.000001 ether;
    uint public lastPaintTimestamp;
    uint public timeBank;
    uint public colorBank;
    address public lastPainter;

    mapping (address => mapping (uint => uint)) public userColorCount;
    mapping (uint => uint) public colorCount;

    mapping (address => uint) knownRewards;

    event CellPainted(uint x, uint y, uint color, address painter);

    function paintCell(uint x, uint y, uint8 color) public payable {
        require(color < 10, "Invalid color");
        require(x < gridSize && y < gridSize, "Invalid cell coordinates");
        require(msg.value >= paintPrice, "Insufficient ETH sent");
        require(grid[x][y].color != color, "Cell is already this color");

        tryDistributeTimeBank();
    
        grid[x][y].color = color;
        grid[x][y].lastPaintTime = block.timestamp;
        grid[x][y].painter = msg.sender;

        userColorCount[msg.sender][color]++;
        colorCount[color]++;

        uint paintShare = msg.value * 20 / 100;
        uint timeShare = msg.value - paintShare;
        colorBank += paintShare;
        timeBank += timeShare;
        paintPrice += paintPrice * 3 / 100;

        lastPaintTimestamp = block.timestamp;
        lastPainter = msg.sender;

        tryDistributeColorBank();

        emit CellPainted(x, y, color, msg.sender);
    }

    function checkNewTimeReward() internal view returns (bool) {
        return block.timestamp >= lastPaintTimestamp + 10 minutes && lastPainter == msg.sender;
    }

    function checkReward() external view returns (uint) {
        uint result = knownRewards[msg.sender];
        if (checkNewTimeReward()) {
            result += timeBank;
        }
        return result;
    }

    function claimReward() external {
        bool timeRewardGot = checkNewTimeReward();
        require(knownRewards[msg.sender] > 0 || timeRewardGot);
        if (timeRewardGot) {
            tryDistributeTimeBank();
        }
        payable(msg.sender).transfer(knownRewards[msg.sender]);
        knownRewards[msg.sender] = 0;
    }

    function tryDistributeTimeBank() public {
        if (block.timestamp < lastPaintTimestamp + 10 minutes) {
            return;
        }
        knownRewards[msg.sender] += timeBank;
        timeBank = 0;
    }

    function isUniformColor() internal view returns (bool) {
        uint firstColor = grid[0][0].color;
        for (uint i = 0; i < gridSize; i++) {
            for (uint j = 0; j < gridSize; j++) {
                if (grid[i][j].color != firstColor) {
                    return false;
                }
            }
        }
        return true;
    }

    function tryDistributeColorBank() public {
        if (!isUniformColor()) {
            return;
        }
        uint totalColor = grid[0][0].color;
        uint totalPaints = colorCount[totalColor];
        for (uint i = 0; i < gridSize; i++) {
            for (uint j = 0; j < gridSize; j++) {
                address painter = grid[i][j].painter;
                uint userPaints = userColorCount[painter][totalColor];
                uint userReward = colorBank * userPaints / totalPaints;
                knownRewards[painter] += userReward;
            }
        }
        colorBank = 0;
    }
}
