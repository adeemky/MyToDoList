const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose"); 
const _ = require("lodash"); // route ismine yazilanin ilk harfini buyuk yapmak icin lodash indirdik. customListName GET isteginde kullandik
const app = express();
app.set('view engine', 'ejs'); 
app.use(bodyParser.urlencoded({extended: true})); 
app.use(express.static("public")); // Static dosyalarin konumunu belirledik
// SCHEMA/KOLEKSIYON/DEFAULT DOCUMENT OLUSTURMA
mongoose.connect("mongodb+srv://ademkaya:kayadem16@cluster0.bwb2nci.mongodb.net/todolistDB", {useNewUrlParser: true}); // MongoDB'ye (database) baglanti kurduk ve todoListDB adinda bir database olusturduk.
const port = 3000;
const itemsSchema = new mongoose.Schema({name: String}) // Yeni bir schema olusturduk degeri String olacak tek bir keyi var.

const Item = mongoose.model("Item", itemsSchema); // Item adli yeni bir model(koleksiyon) olusturduk yukarda olusturdugumuz itemsSchemanin yapisini kullanacagiz.

const item1 = new Item({name: "Wellcome to your To Do List!"})
const item2 = new Item({name: "Hit + to add a new item"})
const item3 = new Item({name: "<-- Hit here to delete an item"})
const defaultItems = [item1, item2, item3]; // Defaulf olarak kullanmak istedigimiz 3 tane Item koleksiyonuna girecek documents olusturduk.
// SCHEMA/KOLEKSIYON FARKLI LISTELER ICIN 
const listSchema = { // Express Route parameters kullanarak farkli liste tipleri olusturdugumuz icin yeni bir model ihtiyacimiz var. Burada model icin lazim olan schemayi olusturduk
  name: String,
  items: [itemsSchema] // items'in degeri bir array icindeki deger ise yukarida olusturdugumuz itemsSchema. Boylece default ogeleri(defaultItems arrayini) icine eklebilecegiz
};

const List = mongoose.model("List", listSchema); // Yeni olusturdugumuz listSchemayi kullanarak adi List olan bir koleksiyon olusturduk
// GET ANA SAYFA
app.get("/", function(req, res) { 
  Item.find() // Item koleksiyonu icindeki herseyi ariyoruz
  .then((foundItems) => { // foundItems parametresi bize sonucu veriyor
    if (foundItems.length === 0) { // Eger Items koleksiyonu (koleksiyonlar bir arraydir) bossa
      Item.insertMany(defaultItems) // Item koleksiyonuna defaultItems arrayini ekliyoruz
      .then(() => {
        console.log("Successfully saved all the fruits to todoListDB"); // insertMany'den sonra .then/.catch zorunludur. Hata vermezse bu kod calisir.
      })
      .catch((err) => {console.log(err);})
      res.redirect("/"); // Koleksiyona defaultItems'i ekledikten sonra ana sayfaya yonlendirir
    } else {
      res.render("list", {listTitle: "Today", newListItems: foundItems}); // Eger Item koleksiyonu bos degilse (yani defaultItems zaten icindeyse) list.ejs renderlanir. ejs vari olan newListItems'in degeri Items koleksiyonuna karsilik gelen foundItems'dir.
    }   
  }).catch((err) => {console.log(err);})
});
// GET Express Route
app.get("/:customListName", (req, res) => { // Express Route parameters kullanarak farkli liste isimleri icin farkli route'lar olusturabilirirz
  const customListName = _.capitalize(req.params.customListName); // _.capitalize ilk harfi buyuk kalan harfleri kucuk yazar. / req.params.customListName /'den sonra yazilan yazinin(Express Route parameters) degeridir.
  
  List.findOne({name: customListName}) // List schemasinin icinde name'e deger olarak customListName'e yazilan yaziyi deger alan bir object var mi diye ariyoruz.
  .then((foundList) => { // foundList parametresi sadece name'in degerini yazdirir. / .then/.catch zorunludur.
    if(!foundList) { // Parametredeki !(doesn't exist) anlamina gelir / Eger foundList yoksa ..    
      const list = new List({ // List koleksiyonu icin yeni bir document olusturur
        name: customListName, // name degerini route'a yazilan degerden alir
        items: defaultItems // items arrayine default ogeleri ekler 
      })
      list.save(); // Yeni dokumani kaydeder.
      res.redirect("/" + customListName) // Ve sayfayi route'a yazilan kelimenin route'una yonlendirir 
    } else {
      res.render("list", {listTitle: customListName, newListItems: foundList.items}) // Eger zaten boyle bir name varsa sayfaya list.ejs yazdirilir. Baslik(listTitle) Route'yazilan kelimenin degerini alir(customListName).
    }
  });
})
// POST REQUEST
app.post("/", function(req, res){ // Buttona tiklaninca yapilan istek 
  const itemName = req.body.newItem; // Inputa yazilan yazilarin degeri(yeni bir madde eklersen onun degerini alir)
  const listName = req.body.list; // name'i list olan button'in value'sine karsilik gelir. Value ise listTitle adli ejs varidir, degerini ise Sayfanin basligindan(h1) alir. 

  const item = new Item({name: itemName}) // Item koleksiyonuna eklenecek yeni bir dokuman olusturduk degerini inputa yazilan kelimeden alir.

  if (listName === "Today") { // Eger listName(yani button value'si -Baslik) Today(yani route ana sayfada) ise ...
    item.save(); // item adli constu Item koleksiyonuna kaydeder.
    res.redirect("/"); // Ana sayfaya yonlendirir
  } else { // Eger Today degilse ...
    List.findOne({name: listName}) // List adli koleksiyon icinden name degeri listName(degerini get istegindeki customListName'den yani route yazilan kelimeden alir) olan objecti arar.
    .then((foundList) => { // foundList parametresi sonucu yazdirir.
      foundList.items.push(item) // name'i foundList olan objectin icindeki items(keyi) arrayine item adli constu(yani inputa girilen kelimeyi) pushlar.
      foundList.save(); // Olusturdugumuz yeni documenti kaydeder.
      res.redirect("/" + listName) // Ve sayfayi route'a yazilan kelimenin route'una yonlendirir 
    })
  }
}); 
// CHECKBOX POST (DELETE) REQUEST
app.post("/delete", (req, res) => { // action="/delete" method="post" olan form'a cevap verir... 
  const checkedItemId = req.body.checkbox; // Degeri name'i ve type'i checkbox olan inputun _idsi yani secilen checkbox'in idsidir.
  const listName = req.body.listName; // name listName olan hidden inputun valuesi listTitle yani sayfanin basligidir. Bu gizli inputu dogru listenin koleksiyonuyla islem yapalim diye ekledik.

  if (listName === "Today") { // Eger hidden inputun degeri Today ise ... 
    Item.findByIdAndRemove(checkedItemId) // findByIdAndRemove sadece id'yi arar ve cikartir. parametreye id ismini yazman yeterli. checkedItemId secilen checkbox'in idsidir
      .then(() => {
        res.redirect("/"); // Sildikten sonra ana sayfaya yonlendirir.
      })
      .catch(() => {console.log("delete error");});
  } else { // Eger hidden inputun degeri Today degil ise ... 
    List.findOneAndUpdate({ name: listName },{ $pull: { items: { _id: checkedItemId }}}) // Bir koleksiyonun icindeki objectin icindeki degeri array olan bir keyi silmek icin findOneAndUpdate metodunu kullan. Devami ... ⬇︎⬇︎⬇︎
      .then((foundList) => { // ... findOneAndUpdate'in {1. parametresine aradigin objecti belirt(yani name'i listName olan object)}, {2. parametresindeki $pull silmeye yarar. degerine silmek istedigin keyi gir. yani {items(keyi) arrayinin icinde _id'si checkedItemId}yi hedef alir.}
        res.redirect("/" + listName); // Ve sayfayi route'a yazilan kelimenin route'una yonlendirir 
      })
      .catch((err) => {console.log("err in delete item from custom list")});
  }
})

app.listen(process.env.PORT || port, function() {console.log("Server started on port 3000");});
