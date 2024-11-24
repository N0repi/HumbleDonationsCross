// submit.js

export default async function handler(req, res) {
    const data = req.body
    const title = await createItem(data)
    res.status(200).json({ title })
}
