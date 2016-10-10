var express=require("express");
var app=express();
var mongo=require("mongodb").MongoClient;
var https=require("https");
var mongoURL=process.env.MONGO_URI;
var apikey=process.env.API_KEY;
var cx=process.env.CX;
var url='https://www.googleapis.com/customsearch/v1?key='+apikey+'&cx='+cx+'&q=';

function dbInsert(str) {
    mongo.connect(mongoURL,function(err,db){
        if(err) {return err}
        else {
            var obj={"term":str,"when":Date()};
            db.collection("imgsearch").insert(obj, function(err,data){
                if (err) {return err}
                else {
                   db.close(); 
                }
            });
        }
    });
}

app.get("/last/",function(req,res) {
    mongo.connect(mongoURL,function(err,db){
        if (err) {return err}
        else {
            db.collection("imgsearch").find({},{"_id":false}).sort({_id:-1}).limit(10).toArray(function(err,data){
                if (err) return err;
                if (data) res.send(data);
                db.close();
            });
        }
    });
});

app.get("/search/:searchterm", function(req,res){
    var offset=!req.query.offset?'':'&start='+req.query.offset;
    var body=''; 
    var term=req.params.searchterm;
    dbInsert(term);
    https.get(url+term+" image"+offset, function(resp){
        resp.on('data',function(data){body+=data});
        resp.on('end',function(){
            var response=[];
            var parsed=JSON.parse(body)["items"];
            for (var i=0;i<parsed.length;i++) {
               response.push({
                   "image_url":parsed[i]["pagemap"]["cse_image"][0]["src"] ,
                   "alt_text":parsed[i]["link"],
                   "page_url":parsed[i]["snippet"]
               });
            }
            res.send(response);
        });
    });
});

app.get("/", function(req,res){
    res.send(`<pre> 
    Image Search Abstraction Layer - FreeCodeCamp BackEnd Project
    
    Usage1: https://liorban-image-search.herokuapp.com/search/your-search-term
    will return an array of objects containing image URL, page URL and description
    
    add ?offset=<number> to the URL to paginate through the responses
    
    Examples:
    https://liorban-image-search.herokuapp.com/search/tiger
    https://liorban-image-search.herokuapp.com/search/tiger?offset=2
    
    Usage2: https://liorban-image-search.herokuapp.com/last
    will return another array of objects containing the terms, date and time of the last searches.
    </pre>`);
});

app.listen(process.env.PORT || 8080);