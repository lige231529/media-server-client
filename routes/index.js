let express = require('express');
let router = express.Router();
router.get('/', function(req, res) {
    res.render('index',{title:'会议室'});
});

module.exports = router;
