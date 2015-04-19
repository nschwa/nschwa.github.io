console.log('test');
var VERSION = 2;
var DB_NAME = 'imageDB';
var STORE   = 'images_v1';

var API_KEY = '5dd79e0f6030165e7eb12657ce4ace6f';
var apiUrl  = 'https://api.flickr.com/services/rest/';
var method  = 'flickr.photos.search';
var currSearch = false;
var currPage = 1;
var availPages = false;

var selectedImages = [];

$('#controls').find('li').addClass('disabled');

//  Opens the Databaseconnection to DB pets
var openRequest = indexedDB.open(DB_NAME, VERSION);

//  Database has changed
openRequest.onupgradeneeded = function(e) {
  console.log('Upgrading...')
  var thisDB = this.result;
  if (!thisDB.objectStoreNames.contains(STORE) ) {
    console.log('Creating Store %s', STORE);
    var objectStore = thisDB.createObjectStore(STORE, {
      keyPath: 'ID',
      autoIncrement: true
    });
    objectStore.createIndex('search', 'search',  {unique: false});
    objectStore.createIndex('group', 'group',  {unique: false});
    objectStore.createIndex('thumbUrl', 'thumbUrl',  {unique: false});
    objectStore.createIndex('url', 'url',  {unique: true});
  }; // endif
  
}

//  Everything is fine
openRequest.onsuccess = function(e) {
  console.log("running onsuccess...");
  //  Stores database globally 
  db = e.target.result;
}

//  Something went wrong
openRequest.onerror = function(e) {
  alert('Beim Öffnen der Datenbank ist etwas schiefgelaufen!');
}

//  Functions
function loadImgBlob(url) {
  // Create XHR
  var xhr = new XMLHttpRequest(), blob;
  xhr.open("GET", url, true);
  // xhr.setRequestHeader("Access-Control-Allow-Origin", "https://farm8.staticflickr.com"); 
  // xhr.setRequestHeader("Access-Control-Allow-Credentials", "true");
  // xhr.setRequestHeader("Access-Control-Allow-Methods", "GET");
  // Set the responseType to blob
  xhr.responseType = "blob";
   
  xhr.addEventListener("load", function () {
    if (xhr.status === 200) {
      // File as response
      blob = xhr.response;
      console.log("Image retrieved for URL:");
      console.log(url);
      console.log('loaded %d bytes!', blob.size);
      console.log('Try to put in DB...');
      var trans = db.transaction([STORE], 'readwrite');
      var store = trans.objectStore(STORE);
      var request = store.add({
        image: blob,
        url: url,
        search: currSearch.toLowerCase(),
        group: false
      });
      request.onsuccess = function(e) {
        console.log('Store item successfully '+e.target.result);
      }
    }
  }, false);
  // Send XHR
  xhr.send();
}

function buildUrl (photos) {
  var urlArr = [];    
  $.each(photos, function(){
    var photo = this;
    var imgUrl = 'https://farm'
    imgUrl +=photo.farm
    imgUrl +='.staticflickr.com/'
    imgUrl += photo.server
    imgUrl +='/'+photo.id+'_'+photo.secret;
    var thumb = imgUrl + '_m.jpg';
    var big = imgUrl + '_z.jpg';
    urlArr.push({thumbNail: thumb, image: big});
  });  
  $(document).trigger('urlsReady', [urlArr]);
}

function flickerSearch(searchTag, max) {
  console.log('Loading from Flickr...');
  $('#controls').find('li').addClass('disabled');
  var req = $.get(apiUrl, {
    method: method,
    api_key: API_KEY,
    per_page: max,
    tags: searchTag,
    page: currPage,
    format: 'json',
    nojsoncallback:1
  });    

  req.done(function(data){
    var statusOK = data.stat == 'ok';
    console.log(data);
    if (statusOK) {
      $('#controls').find('li').toggleClass('disabled');
      currPage = data.photos.page;
      availPages = data.photos.pages;
      console.log('Page %d of %d', currPage, availPages);
      var photos = data.photos;
      buildUrl(photos.photo);
    }
  });
};

function buildPreview (urls) {
   $('#preview-images').html('');
  $.each(urls, function(index, url){
    var thumb = $('<img>', {
      class: 'preview img-thumbnail',
      src: url.thumbNail
    });

    if (selectedImages.indexOf(url.image) !== -1) {
      console.log('Found known ... ');
      thumb.addClass('selected');
    }

    var link = $('<a/>', {
      html: thumb,
      href: url.image,
    }).bind('click', previewClickHandler);

    $('#preview-images').append(link);
  });
  
};

//  Events 
$('#search').submit(submitHandler);

$(document).on('urlsReady', showUrls);

$('#controls').find('a').click(pagerHandler);

$('#save-images').click(saveImages);

// $()
//  Handler
function saveImages(event) {
  event.preventDefault();
  $.each(selectedImages, function(index, image){
    loadImgBlob(image);
  });
};

function previewClickHandler(e) {
  e.preventDefault();
  var link = $(this).attr('href');
  var arrIndex = selectedImages.indexOf(link);
  var inArr = arrIndex !== -1;

  if (!inArr) {
    selectedImages.push($(this).attr('href'));
  } else {
    selectedImages.splice(arrIndex, 1);
  }
  $(this).find('img').toggleClass('selected');
}

function pagerHandler(e) {
  e.preventDefault();
  var dir = $(this).attr('id');
  if (dir == 'next' && currPage < availPages) {
    currPage++;
    flickerSearch(currSearch, 15);
  } else if (dir == 'prev' && currPage > 1) {
    currPage--;
    flickerSearch(currSearch, 15);
  }
  console.log('current'+currPage);
}

function showUrls(event, urls) {
  console.log('Seems like there are som urls...');
  buildPreview(urls);
}

function submitHandler(event) {
  event.preventDefault();
  var searchString = $('#search-string').val();
  //  Reset Globals
  // selectedImages = [];
  currPage = 1;
  console.log(searchString);
  currSearch = searchString;
  flickerSearch(searchString, 15);
}









