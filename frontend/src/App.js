import './App.css';
import React, { useEffect, Component } from 'react';
import colorGameABI from './ContractAbi';
import Web3 from 'web3';

const colorGameAddress = "0xD6BDAeAA27b0E0513C6A54bb2f6F744DbEF8aae8";

const colorMapping = [
    "#ffffff",
    "#d53e4f",
    "#f46d43",
    "#fdae61",
    "#fee08b",
    "#e6f598",
    "#abdda4",
    "#66c2a5",
    "#3288bd",
    "#5e4fa2",
]

const gridColors = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

let reward = 0;

class GameManager {
    init() {
        if (window.ethereum) {
            window.ethereum.enable();
            this.web3 = new Web3(window.ethereum);
            // await window.ethereum.enable();
            const accounts = this.web3.eth.accounts;
            this.account = accounts[0];
            this.colorGame = this.web3.eth.contract(
                colorGameABI
            ).at(
                colorGameAddress
            );
        } else {
            console.error("No extension for ethereum found");
        }
    }

    getGridState() {
        let result = gridColors;
        let promises = []
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                promises.push(this.colorGame.grid.call(i, j, (err, res) => {
                    if (!err) {
                        result[i][j] = res[0].toNumber();
                    } else {
                        console.error('grid call failed: ' + err);
                    }
                }));
                
            }
        }
        return {
            promise: Promise.all(promises),
            result: result,
        }
    }

    getRewardSize() {
        let promises = []
        promises.push(this.colorGame.checkReward.call({from: this.account}, (err, res) => {
            if (!err) {
                console.log('aaaaa', res.toNumber());
                reward = res.toNumber();
            } else {
                console.error("Call to checkReward failed");
            }
        }));
        return {
            promise: Promise.all(promises),
            result: reward,
        };
    }

    paintCell(x, y, color) {
        let paintPrice = 0;
        this.colorGame.paintPrice.call((err, res) => {
            if (!err) {
                console.log('Paint price: ' + res)
                paintPrice = res;
                if (paintPrice == 0) {
                    console.error('not found paint price')
                    return false;
                }
                this.colorGame.paintCell.sendTransaction(
                    x, y, color, {from: this.account, value: paintPrice},
                    (err, res) => {
                        if (!err) {
                            console.log(res);
                        } else {
                            console.log('paintCell call failed: ' + err);
                        }
                    }
                )
                return true;
            } else {
                console.error('paintPrice call failed: ' + err);
            }
        });
        
    }
}

class GameBoard extends React.Component {
    constructor(props) {
        super(props);
        this.gameManager = new GameManager();
        this.gameManager.init()
        let grid_state = this.gameManager.getGridState();
        let game_reward = this.gameManager.getRewardSize();
        let promises = [grid_state.promise, game_reward.promise]
        let promise = Promise.all(promises);
        promise.then(
            this.state = {
                currentColor: 0,
                colors: grid_state.result,
                reward: game_reward.result,
            }
        )
        
    }

    // updateReward = () => {
    //     this.gameManager.getRewardSize();
    // }

    renderReward = () => {
        // setInterval(this.updateReward, 5000);
        return (
            <div onClick={() => {this.setState({reward: reward})}}>
                Current reward: {reward * 0.000000000000000001} ETH
            </div>
        )
    }

    renderRewardButton = () => {
        return (
            <>
                Claim reward
            </>
        )
    }

    renderGrid = () => {
        let grid = []
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                grid.push(
                    <div
                        key={'${i}+${j}'}
                        className="grid_cell"
                        onClick={() => {this.paint(i, j)}}
                        style={{backgroundColor: colorMapping[this.state.colors[i][j]]}}
                    ></div>
                )
            }
        }
        return grid;
    }

    chooseColor = (color) => {
        this.setState({currentColor: color})
        console.log(reward);
    }

    paint = (i, j) => {
        var currentColor = this.state.currentColor;
        if (!this.gameManager.paintCell(i, j, currentColor)) {
            return;
        }
        var colors = this.state.colors.slice();
        colors[i][j] = currentColor;
        this.setState({colors: colors})
    }

    renderPalette = () => {
        let palette = []
        for (let i = 0; i < 10; i++) {
            palette.push(
                <div
                    className="palette_cell"
                    onClick={() => this.chooseColor(i)}
                    style={{
                        backgroundColor: colorMapping[i]
                    }}
                >
                </div>
            )
        }
        return palette
    }

    render() {
        return (
            <>
            <div className="game_board">
                {this.renderGrid()}
            </div>
            <div className="palette_board">
                {this.renderPalette()}
            </div>
            <div className="reward_box">
                {this.renderReward()}
            </div>
            <div className="reward_button">
                {this.renderRewardButton()}
            </div>
            </>
        )
    }
}

function BoardPage() {
    return (
        <div className='App'>
            <GameBoard />
        </div>
    )
}

class App extends React.Component {
    render() {
        return (
            <BoardPage />
        );
    }
}

export default App;
