

const loadAbout = async (req, res)=>{
    try {
        return res.render("about")
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    loadAbout
}