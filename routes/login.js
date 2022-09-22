const express = require('express');
const router = express.Router();

//进来之后相当于登陆页
router.get('/', async(req, res)=> {
    res.render('login', { title: '登陆'});
});

module.exports = router