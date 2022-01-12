import { useEffect, useState } from "react";
import Caver from "caver-js";
import contract from "../contracts/contract.json";
import Hero from "../assets/hero.png";

const initialInfoState = {
    connected: false,
    status: null,
    account: null,
    caver: null,
    contract: null,
    address: null,
    contractJSON: null,
};

const initialMintState = {
    loading: false,
    status: `Mint your ${contract.name}`,
    amount: 1,
    supply: "0",
    cost: "0",
};

function Minter() {
    const [info, setInfo] = useState(initialInfoState);
    const [mintInfo, setMintInfo] = useState(initialMintState);
    const [isEnabled, setIsEnabled] = useState(false);
    const [caver, setCaver] = useState();
    console.log(mintInfo);

    // init 함수: 메타마스크 연결
    const init = async (_request, _contractJSON) => {
        if (window.klaytn.isKaikas) {
            try {
                const accounts = await window.klaytn.enable();
                const networkId = await window.klaytn.networkVersion;
                // networkId
                // 1001: 바오밥
                // 8217: 사이프러스~

                // 폴리곤 chain id인 경우 지갑 통해서 네트워크 연결

                if (networkId == _contractJSON.chain_id) {
                    // 수정필요
                    console.log("here--------------");
                    let caver = new Caver(window.klaytn);
                    setCaver(caver);

                    setInfo((prevState) => ({
                        ...prevState,
                        connected: true,
                        status: null,
                        account: accounts[0],
                        caver: caver,
                        contract: new caver.klay.Contract(
                            _contractJSON.abi,
                            _contractJSON.address
                        ),
                        contractJSON: _contractJSON,
                    }));
                } else {
                    setInfo(() => ({
                        ...initialInfoState,
                        status: `Change network to ${_contractJSON.chain}.`,
                    }));
                }
            } catch (err) {
                console.log(err.message);
                setInfo(() => ({
                    ...initialInfoState,
                }));
            }
        } else {
            setInfo(() => ({
                ...initialInfoState,
                status: "Please install metamask.",
            }));
        }
    };

    // initListeners 함수: 계정이나 체인이 변경되었는지 확인
    const initListeners = () => {
        if (window.klaytn) {
            window.klaytn.on("accountsChanged", () => {
                window.location.reload();
            });
            window.klaytn.on("networkChanged", () => {
                window.location.reload();
            });
        }
    };

    const getSupply = async () => {
        console.log("info---------");
        console.log(info);
        const params = {
            gas: "0x2710",
            to: info.contractJSON.address,
            from: window.klaytn.selectedAddress,
            data: info.contract.methods.totalSupply().encodeABI(),
        };
        try {
            // const result = await caver.klay.sendAsync({
            //     method: "klay_call",
            //     params: [params],
            // });
            const result = await info.contract.call("totalSupply");

            setMintInfo((prevState) => ({
                ...prevState,
                supply: info.caver.utils.hexToNumberString(result),
            }));
        } catch (err) {
            setMintInfo((prevState) => ({
                ...prevState,
                supply: 0,
            }));
        }
    };

    const getCost = async () => {
        const params = {
            to: info.contractJSON.address,
            from: info.account,
            data: info.contract.methods.getPrice().encodeABI(),
        };
        try {
            // const result = await window.klaytn.sendAsync({
            //     method: "klay_call",
            //     params: [params],
            // });
            // console.log(info.caver.utils.hexToNumberString(result));
            const result = await info.contract.call("getPrice");
            console.log(result);
            setMintInfo((prevState) => ({
                ...prevState,
                cost: info.caver.utils.hexToNumberString(
                    info.caver.utils.convertFromPeb(result, "KLAY")
                ),
            }));
        } catch (err) {
            setMintInfo((prevState) => ({
                ...prevState,
                cost: "0",
            }));
        }
    };

    const mint = async () => {
        // const params = {
        //     to: info.contractJSON.address,
        //     from: info.account,
        //     value: String(
        //         info.caver.utils.toHex(Number(mintInfo.cost) * mintInfo.amount)
        //     ),
        //     data: info.contract.methods
        //         .mint(info.account, mintInfo.amount)
        //         .encodeABI(),
        // };
        try {
            setMintInfo((prevState) => ({
                ...prevState,
                loading: true,
                status: `Minting ${mintInfo.amount}...`,
            }));
            // const txHash = await window.klaytn.sendAsync({
            //     method: "klay_sendTransaction",
            //     params: [params],
            // });
            //> myContract.send({ from: '0x{address in hex}', gas: 1000000 }, 'methodName', 123).then(console.log)
            console.log("cost:", mintInfo.cost);
            const result = await info.contract.send(
                {
                    from: info.account,
                    gas: 1000000,
                    value: String(
                        caver.utils.toHex(
                            Number(mintInfo.cost) * mintInfo.amount
                        )
                    ),
                },
                "mint",
                info.account,
                mintInfo.amount
            );
            setMintInfo((prevState) => ({
                ...prevState,
                loading: false,
                status: "Nice! Your NFT will show up on Opensea, once the transaction is successful.",
            }));
            getSupply();
        } catch (err) {
            console.error(err);
            setMintInfo((prevState) => ({
                ...prevState,
                loading: false,
                status: err.message,
            }));
        }
    };

    const updateAmount = (newAmount) => {
        if (newAmount <= 5 && newAmount >= 1) {
            setMintInfo((prevState) => ({
                ...prevState,
                amount: newAmount,
            }));
        }
    };

    const connectToContract = (_contractJSON) => {
        init("klay_getAccount", _contractJSON);
    };

    useEffect(() => {
        connectToContract(contract);
        initListeners();
    }, []);

    useEffect(() => {
        if (info.connected) {
            getSupply();
            getCost();
        }
    }, [info.connected]);

    return (
        <div className="page">
            <div className="card">
                <div className="card_header colorGradient">
                    <img
                        className="card_header_image ns"
                        alt={"banner"}
                        src={Hero}
                    />
                </div>
                {mintInfo.supply < contract.total_supply ? (
                    <div className="card_body">
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <button
                                disabled={
                                    !info.connected || mintInfo.cost == "0"
                                }
                                className="small_button"
                                onClick={() =>
                                    updateAmount(mintInfo.amount - 1)
                                }
                            >
                                -
                            </button>
                            <div style={{ width: 10 }}></div>
                            <button
                                disabled={
                                    !info.connected || mintInfo.cost == "0"
                                }
                                className="button"
                                onClick={() => mint()}
                            >
                                Mint {mintInfo.amount}
                            </button>
                            <div style={{ width: 10 }}></div>
                            <button
                                disabled={
                                    !info.connected || mintInfo.cost == "0"
                                }
                                className="small_button"
                                onClick={() =>
                                    updateAmount(mintInfo.amount + 1)
                                }
                            >
                                +
                            </button>
                        </div>
                        {info.connected ? (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <p
                                    style={{
                                        color: "var(--statusText)",
                                        textAlign: "center",
                                    }}
                                >
                                    {mintInfo.cost * mintInfo.amount}{" "}
                                    {contract.chain_symbol}
                                </p>
                                <div style={{ width: 20 }}></div>
                                <p
                                    style={{
                                        color: "var(--statusText)",
                                        textAlign: "center",
                                    }}
                                >
                                    |
                                </p>
                                <div style={{ width: 20 }}></div>
                                <p
                                    style={{
                                        color: "var(--statusText)",
                                        textAlign: "center",
                                    }}
                                >
                                    {mintInfo.supply}/{contract.total_supply}
                                </p>
                            </div>
                        ) : null}
                        {mintInfo.status ? (
                            <p className="statusText">{mintInfo.status}</p>
                        ) : null}
                        {info.status ? (
                            <p
                                className="statusText"
                                style={{ color: "var(--error)" }}
                            >
                                {info.status}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <div className="card_body">
                        <p
                            style={{
                                color: "var(--statusText)",
                                textAlign: "center",
                            }}
                        >
                            {mintInfo.supply}/{contract.total_supply}
                        </p>
                        <p className="statusText">
                            We've sold out! .You can still buy and trade the{" "}
                            {contract.name} on marketplaces such as Opensea.
                        </p>
                    </div>
                )}
                <div className="card_footer colorGradient">
                    <button
                        className="button"
                        style={{
                            backgroundColor: info.connected
                                ? "var(--success)"
                                : "var(--warning)",
                        }}
                        onClick={() => connectToContract(contract)}
                    >
                        {info.account ? "Connected" : "Connect Wallet"}
                    </button>
                    {info.connected ? (
                        <span className="accountText">
                            {String(info.account).substring(0, 6) +
                                "..." +
                                String(info.account).substring(38)}
                        </span>
                    ) : null}
                </div>
                <a
                    style={{
                        position: "absolute",
                        bottom: 55,
                        left: -75,
                    }}
                    className="_90"
                    target="_blank"
                    href="https://polygonscan.com/token/0x827acb09a2dc20e39c9aad7f7190d9bc53534192"
                >
                    View Contract
                </a>
            </div>
        </div>
    );
}

export default Minter;
