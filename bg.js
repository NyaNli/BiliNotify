var uid = null;
var lastid = localStorage.getItem('lastid');
var type = 0xFFFFFFF;

var live = new Map();
var tmpmap = new Map();

var timer = null;

var notify = [];

function loadUid() {
    getJson("https://api.bilibili.com/x/web-interface/nav", function(data) {
        uid = data.data.mid;
    });
}

function loadMsg() {
    if (uid == null)
        loadUid();
    var url = "https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?"
        + "uid=" + uid
        + "&type=" + type;
    if (lastid == null) {
        getJson(url, function(data) {
            lastid = data.data.cards[0].desc.dynamic_id_str;
            localStorage.setItem('lastid', lastid);
        });
    } else {
        url += "&current_dynamic_id=" + lastid;
        getJson(url, function(data) {
            if (data.data.update_num == 0)
                return;
            var cards = data.data.cards;
            for (var i = data.data.update_num > cards.length ? cards.length-1 : data.data.update_num-1; i >= 0; i--) {
                var _type = cards[i].desc.type;
                if (_type == 1) {
                    var card = JSON.parse(cards[i].card);
                    if (card.item.orig_type == 8) {
                        var origin_card = JSON.parse(card.origin);
                        // var options={
                        //     dir: "ltr",
                        //     lang: "utf-8",
                        //     icon: card.user.face,
                        //     body: "转发自 " + card.user.uname + "\n" + card.item.content,
                        //     tag: "https://www.bilibili.com/video/av" + origin_card.aid
                        // };
                        // var n = new Notification(origin_card.title, options);
                        // n.addEventListener('click', onNotifyClick);
                        sendNotify(origin_card.title, "转发自 " + card.user.uname + "\n" + card.item.content, card.user.face, "https://www.bilibili.com/video/av" + origin_card.aid);
                    } else if (card.item.orig_type == 512) {
                        var origin_card = JSON.parse(card.origin);
                        // var options={
                        //     dir: "ltr",
                        //     lang: "utf-8",
                        //     icon: card.user.face,
                        //     body: "转发自 " + card.user.uname + "\n" + card.item.content,
                        //     tag: origin_card.url
                        // };
                        // var n = new Notification(origin_card.apiSeasonInfo.title, options);
                        // n.addEventListener('click', onNotifyClick);
                        sendNotify(origin_card.apiSeasonInfo.title, "转发自 " + card.user.uname + "\n" + card.item.content, card.user.face, origin_card.url);
                    }
                } else if (_type == 8) {
                    var card = JSON.parse(cards[i].card);
                    // var options={
                    //     dir: "ltr",
                    //     lang: "utf-8",
                    //     icon: card.pic,
                    //     body: card.owner.name,
                    //     tag: "https://www.bilibili.com/video/av" + card.aid
                    // };
                    // var n = new Notification(card.title, options);
                    // n.addEventListener('click', onNotifyClick);
                    sendNotify(card.title, card.owner.name, card.pic, "https://www.bilibili.com/video/av" + card.aid);
                } else if (_type == 512) {
                    var card = JSON.parse(cards[i].card);
                    // var options={
                    //     dir: "ltr",
                    //     lang: "utf-8",
                    //     icon: card.cover,
                    //     body: card.new_desc,
                    //     tag: card.url
                    // };
                    // var n = new Notification(card.apiSeasonInfo.title, options);
                    // n.addEventListener('click', onNotifyClick);
                    sendNotify(card.apiSeasonInfo.title, card.new_desc, card.cover, card.url);
                }
            }
            lastid = cards[0].desc.dynamic_id_str;
            localStorage.setItem('lastid', lastid);
        });
    }
}

function getJson(url, callback) {
    var xml = new XMLHttpRequest();
    xml.open('GET',url);
    xml.responseType = 'json';
    xml.onreadystatechange = function(e) {
        var _this = e.target;
        if (_this.readyState == 4 && _this.status == 200)
            callback(_this.response);
    }
    xml.send(null);
}

// self.addEventListener("notificationclick", function(event) {
//     console.log(e);
// })

// function onNotifyClick(e) {
    // console.log('a');
    // console.log(this);
    // console.log(e);
    // console.log(e.target.tag);
    // window.open(e.target.tag, "_blank");
    // window.open("https://t.bilibili.com", "_blank");
// }

function sendNotify(title, msg, icon, url) {
    if (typeof(icon) != 'undefined' && icon != '') {
        var xml = new XMLHttpRequest();
        xml.open('GET',icon);
        xml.responseType = 'blob';
        xml.onreadystatechange = function(e) {
            var _this = e.target;
            if (_this.readyState == 4) {
                var pic = '0.png';
                if (_this.status == 200) {
                    pic = URL.createObjectURL(_this.response);
                }
                chrome.notifications.create("biliNotify" + Math.random(), {
                    type: "basic",
                    iconUrl: pic,
                    title: title,
                    message: msg
                }, function(id) {
                    notify[id] = url;
                });
            }
        }
        xml.send(null);
    } else {
        chrome.notifications.create("biliNotify" + Math.random(), {
            type: "basic",
            iconUrl: '0.png',
            title: title,
            message: msg
        }, function(id) {
            notify[id] = url;
        });
    }
}

function loadLive(page) {
    var url = 'https://api.live.bilibili.com/relation/v1/feed/feed_list?page=' + page;
    getJson(url, function(data) {
        var list = data.data.list;
        if (list.length == 0) {
            var iterator = tmpmap.keys();
            while(true) {
                var ikey = iterator.next();
                if (ikey.done)
                    break;
                var key = ikey.value;
                if (!live.has(key)) {
                    var value = tmpmap.get(key);
                    // var options={
                    //     dir: "ltr",
                    //     lang: "utf-8",
                    //     icon: value.pic,
                    //     body: value.uname + " 直播中",
                    //     tag: value.link
                    // };
                    // var n = new Notification(value.title, options);
                    // n.addEventListener('click', onNotifyClick);
                    sendNotify(value.title, value.uname + " 直播中", value.pic, value.link);
                }
            }
            live = tmpmap;
            tmpmap = new Map();
            return;
        }
        for (var i = 0; i < list.length; i++) {
            tmpmap.set(list[i].roomid, list[i]);
        }
        loadLive(page+1);
    });
}

function loadAll() {
    loadMsg();
    loadLive(1);
}

timer = setInterval(loadAll, 10000);

chrome.notifications.onClicked.addListener(function(id) {
    if (/^biliNotify.*/g.test(id)) {
        chrome.tabs.create({
            url: notify[id]
        });
    }
});

// chrome.webRequest.onBeforeRequest.addListener(
//     function() {
//         return {
//             redirectUrl: "https://t.bilibili.com"
//         };
//     },
//     {urls:[chrome.extension.getURL('')]},
//     ["blocking"]
// );