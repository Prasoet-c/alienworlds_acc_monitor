// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from '../AxiosAPI'
import delay from 'delay'

export default async (req, res) => {
    console.log("/get_last_mine called")
    const {
        query: { name },
    } = req
    //console.log(name)
    if(!name || typeof name == "undefined" || name == '') return res.status(400)
    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }
    await delay(getRandom(100,2000))
    await axios.post('https://chain.wax.io/v1/chain/get_table_rows',
    {json: true, code: "m.federation", scope: "m.federation", table: 'miners', lower_bound: name, upper_bound: name},
    { timeout: 15000 }
    ).then((response) => {
        //console.log(data.rows[0]);
        return res.status(response.status).json(response.data)
    }).catch((err) => {
        return axios.post('https://api-wax.eosarabia.net/v1/chain/get_table_rows',
        {json: true, code: "m.federation", scope: "m.federation", table: 'miners', lower_bound: name, upper_bound: name},
        { timeout: 15000 }
        ).then((response) => {
            return response.status(response.status).json(response.data)
        }).catch((err) => {
            console.log("Error get last mine data")
            console.log(err)
            return res.status(err.response.status).json(err.response.data)
        })
    })
    // await axios.post('https://wax.pink.gg/v1/chain/get_account',
    // {
    //     "account_name": name,
    // }
    // ).then((response) => {
    //     //console.log(response)
    //     return res.status(response.status).json(response.data)
    // }).catch((err) => {
    //     console.log("ERROR get cpu data")
    //     console.log(err)
    //     return res.status(err.response.status).json(err.response.data)
    // })
}
