const express = require('express')
const fs = require('fs').promises
const path = require('path')

const app = express()

const productPath = path.join(__dirname, 'db.json')

console.log(productPath)

async function readFile() {
    try{
        let data = await fs.readFile(productPath, 'utf-8')
        return JSON.parse(data)

    }catch(err){
        console.log(err);
    }
}

app.get("/products", async (req, res) => {
    try{

        let products = await readFile()
        res.send(products)
    }catch(err){
        console.log(err);
    }
})
// app.get("/products/:id",async(r))

app.listen(3000)