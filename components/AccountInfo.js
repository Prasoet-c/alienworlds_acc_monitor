import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
const { DateTime } = require("luxon");
import delay from 'delay'

export default function AccountInfo(props) {
    const { account, onDelete, onBalChange, index } = props

    const [acc, setAcc] = useState(account)
    const [loading, setLoading] = useState(true)
    const [accInfo, setAccInfo] = useState({})
    const [balance, setBalance] = useState("Loading")
    const [wax, setWax] = useState("Loading")
    const isInitialMount = useRef(true)
    const isInitialTx = useRef(true)
    const [update, setUpdate] = useState("None")
    const [lastMine, setLastMine] = useState({
        last_mine: "Loading",
        last_mine_tx: "Loading",
        currentLand: "Loading"
    })
    const [history, setHistory] = useState([])
    const [minerName, setMinerName] = useState("Loading")

    const fetchCpuData = async (user) => {
        return await axios.get('/api/get_account/'+user)
        .then(({data}) => {
            const newState = {...data.cpu_limit, cpu_weight: data.self_delegated_bandwidth ? data.self_delegated_bandwidth.cpu_weight : data.total_resources.cpu_weight }
            setAccInfo(newState)
        })
        .catch((err) => {
            console.log("ERROR get cpu data")
            console.log(err.data)
            alert(
            `Error!, server cannot get data of account: ${acc}\nThis account does not exists on WAX, or there is a typo error, please check your spelling!`)
        })
    }
  
    const getBalance = async (user) => {
        return await axios.get(`/api/get_balance/${user}/TLM`)
        .then(({data}) => {
            setBalance(data[0].slice(0,-4))
        })
        .catch((err) => {
            setBalance("ERROR")
        })
    }

    const getWax = async (user) => {
        return await axios.get(`/api/get_balance/${user}/WAX`)
        .then(({data}) => {
            setWax(data[0].slice(0,-4))
        }).catch((err) => {
            setWax("ERROR")
        })
    }

    const getMinerName = async (user) => {
        const minerName = await axios.get(`/api/get_tag/${user}`)
        .then(function({data}) {
            //console.log(data.rows[0]);
            return data.rows[0].tag
        }).catch((err) => {
            return "Error"
        })
        //console.log(minerName)
        setMinerName(minerName)
    }

    const getLastMineInfo = async (user) => {
        const lastMineData = await axios.get(`/api/get_last_mine/${user}`)
        .then(function({data}) {
            //console.log(data.rows[0]);
            return {
                last_mine: data.rows[0].last_mine,
                last_mine_tx: data.rows[0].last_mine_tx,
                currentLand: data.rows[0].current_land
            }
        }).catch((err) => {
            return {
                last_mine: "None",
                last_mine_tx: "None",
                currentLand: "None"
            }
        })
        //console.log(lastMineData)
        const lastMineString = lastMineData.last_mine != "None" ? DateTime.fromISO(lastMineData.last_mine+"Z").setZone("local").toRFC2822() : "Error"
        //console.log("Last mine: "+lastMineString)
        const newLastMine = {
            last_mine: lastMineString,
            last_mine_tx: lastMineData.last_mine_tx,
            currentLand: lastMineData.currentLand
        }
        setLastMine(newLastMine)
    }

    const fetchLastMineTx = async (tx) => {
        if(tx == "None") { return }
        const lastMineTLM = await axios.get(`/api/get_tx/${tx}`
        ).then(function({data}) {
            //console.log("TX RESP")
            //console.log(data)
            //console.log(data.actions[1].act.data.amount)
            return data.actions[1].act.data.amount
        }).catch(async (err) => {
            console.log(err)
            return "ERROR"
        })
        const newHistory = [...history]
        if(newHistory.length == 5) {
            newHistory.shift() //remove first member
        }
        if(history.length === 0 || history.pop().tx !== tx) {
            newHistory.push({
                tx: tx,
                amount: lastMineTLM+" TLM"
            })
            setHistory(newHistory)
        } else {
            //console.log("Duplicate TX")
        }
    }

    useEffect(async () => {
        await getMinerName(acc)
    }, [acc])

    useEffect(async () => {
        //console.log("Loading... "+loading)
        setUpdate(DateTime.now().setZone("local").toRFC2822())
        if(loading) {
            //console.log("Checking... "+acc)
            await fetchCpuData(acc)
            await getLastMineInfo(acc)
        } else {
            //console.log("Not check!")
        }
    }, [loading])

    useEffect(async () => {
        if(isInitialMount.current) {
            isInitialMount.current = false
        } else {
            //console.log("CPU Changed!, is now")
            //console.log(accInfo)
            await getBalance(acc)
            await getWax(acc)
            setLoading(false)
        }
    }, [accInfo])

    useEffect(() => {
        //console.log("Balance changed")
        //console.log(balance)
        onBalChange(balance)
    }, [balance])

    useEffect(() => {
        const interval = setInterval(async () => {
            //console.log("It's time to checking!")
            setLoading(true)
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(async () => {
        if(isInitialTx.current) {
            isInitialTx.current = false
        } else {
            //console.log("Last mine TX Changed!")
            await fetchLastMineTx(lastMine.last_mine_tx)
        }
    }, [lastMine.last_mine_tx])

    const rawPercent = ((accInfo.used/accInfo.max)*100).toFixed(2)
    const percent = accInfo.used ? rawPercent > 100 ? 100 : rawPercent : 0

    return (
        <div className="flex flex-col my-5">
            <span className="font-bold">[{index+1}] Miner: {minerName}</span>
            <div className="flex flex-col lg:flex-row gap-y-2 lg:gap-y-0 w-full items-center">
                <div className="flex mr-3 items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 cursor-pointer" viewBox="0 0 20 20" fill="#FF0000"
                    onClick={() => { onDelete(acc) }}>
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className=" text-lg font-bold">{acc}</span>
                </div>
                <div className="flex-1 w-full lg:w-9/12">
                    <div className="overflow-hidden h-5 text-xs flex rounded bg-gray-800 w-full">
                        <div style={{ width: percent+"%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600">
                            {accInfo.used && <span className="font-bold">{rawPercent}% ({accInfo.used/1000} ms/{accInfo.max/1000} ms)</span>}
                            {!accInfo.used && <span className="font-bold">Loading...</span>}
                        </div>
                    </div>
                </div>
                <div className="flex px-3">
                    <span className="font-bold text-sm text-yellow-300">CPU Staked: {accInfo.cpu_weight}</span>
                </div>
                <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    {balance && <span className="text-lg font-bold text-green-400">{balance} TLM | {wax} WAX</span>}
                    <a href={'https://wax.atomichub.io/explorer/account/'+acc} className="mx-2 px-2 font-bold text-green-600 bg-green-200 rounded-md" rel="noopener noreferrer" target="_blank">View NFT</a>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row w-full mt-1 justify-between">
                <div className="flex flex-col  gap-y-1 lg:gap-y-0.5 mt-1">
                    <span className="text-xs font-bold text-red-500">Current land: <a href={'https://wax.atomichub.io/explorer/asset/'+lastMine.currentLand}>{lastMine.currentLand}</a></span>
                    <span className="text-xs">Last update: {update}</span>
                    <span className="text-xs">Next update: {DateTime.fromRFC2822(update).plus({ minutes: 1}).toRFC2822()}</span>
                </div>
                <div className="flex flex-row lg:flex-col flex-wrap lg:flex-nowrap gap-y-2 mt-2 lg:mt-0 lg:gap-y-0.5">
                    <span className="text-sm font-bold self-end">Last TLM mined ({lastMine.last_mine}):</span>
                    <span className="text-xs my-2 self-end">{history.map((hist, i) => {
                        return (
                            <a key={i} href={hist.tx!="None" ? `https://wax.bloks.io/transaction/`+hist.tx : `#`} rel="noopener noreferrer" target="_blank">
                                <span
                                className={'inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none text-black rounded-full bg-green-'+(600-((history.length-i)*100))}>
                                {hist.amount}
                                </span>
                            </a>
                        )
                    })}
                    </span>
                </div>
            </div>
        </div>
    )
}