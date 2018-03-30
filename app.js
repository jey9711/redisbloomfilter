const express = require('express');
const redis = require('redis');
const bloom = require('bloom-redis');
const async = require('async');
const bodyParser = require('body-parser');

// From Project Gutenberg - opening lines of the top 10 public domain ebooks 
// https://www.gutenberg.org/browse/scores/top 
let opening_lines = { 
  'whats-my-name': 'I heard you good with them soft lips. Yeah you know word of mouth. The square root of sixty nine is eight something, right?', 
  'hotline-bling': 'You used to call me on my cell phone, late night when you need my love.', 
  'take-care': 'I know you\'ve been hurt by someone else. I can tell by the way you carry yourself.', 
  'started-from-the-bottom': 'Started from the bottom now we\'re here. Started from the bottom now the whole team here', 
  'controller': 'Right, my yiy just changed. You just buzzed the front gate.',
  'one-dance': 'Grips on your legs, front way, back way, you know that I don\'t play.', 
  'hold-on-we-are-going-home': 'I got my eyes on you. You\'re everything that I see, I want your hot love and emotion endlessly.', 
  'fake-love': 'I\'ve been down so long, it look like up to me. They look up to me.', 
  'jumpman': 'Jumpman, Jumpman, Jumpman, them boys up to somethin.', 
  'too-good': 'Look, I don\'t know how to talk to you. I don\'t know how to ask you if you\'re okay.' 
};

// Create Redis client
const client = redis.createClient();

client.on('connect', function () {
  console.log('Connected to Redis...')
})

// Set port
const port = 8888

// Init app
const app = express();

let current_data_key = 'current-data', 
      used_data_key = 'used-data';

// Bloom filter
const filter = new bloom.BloomFilter({
  client: client,
  key: 'stale-bloom-filter', //the Redis key 
  size: 1024,
  numHashes: 20
});

app.post('/', bodyParser.text(), function(req,res,next) { 
  let used;
  console.log('POST -', req.body);
  
  // START TIME
  console.time('post');

  // execute multiple async function calls
  async.series([ 
    function(cb) {
      filter.contains(req.body, function(err, filterStatus) {
        if (err) { 
          cb(err); 
        } else {
          used = filterStatus;
          cb(err);
        }
      });
    }, function(cb) {
      if (used === false) {
        // Since bloom filters have no false negatives
        cb(null);
      } else {
        // REMOVE FALSE POSITIVE
        // 150ms delay to simulate slow API call
        setTimeout(function() {
          console.log('Possible false positive');
          client.sismember(used_data_key, req.body, function(err, membership) {
            if (err) { cb(err); } else {
              used = membership === 0 ? false : true;
              cb(err);
            }
          });
        }, 150);
      }
    }, function (cb) {
      // ADD TO BLOOM FILTER IF NOT PRESENT
      if (used === false) {
        console.log('Adding to filter');
        filter.add(req.body, cb);
      } else {
        console.log('Skipped filter addition, due to false positive');
        cb(null);
      }
    }, function (cb) {
      if (used === false) {
        client.multi()
          .set(current_data_key, req.body)
          .sadd(used_data_key, req.body)
          .exec(cb);
      } else { 
        cb(null); 
      }
    }
  ], function (err, cb) {
      if (err) { next(err); } else {
        // END TIME
        console.timeEnd('post');
        res.send({ saved: !used });
      }
    }
  );
});

app.get('/', function(req,res,next) { 
  client.get(current_data_key, function(err, data) { 
    if (err) { 
      next(err); 
    } else { 
      res.send(data); 
    } 
  }); 
});

app.get('/show-content/:user', function(req, res, next) { 
  let content_ids = Object.keys(opening_lines),
      user = req.params.user,
      curr_content_id,
      found = false,
      done = false;

  function isDone() {
    return (!found && !done);
  };

  function asyncIteratee(callback) {
    //get first content Ids
    currContentId = contentIds.shift();
    if (!curr_content_id) {
      done = true;
      callback();
    } else {
      filter.contains(user + curr_content_id, function (err, results) {
        if (err) {
          callback(err);
        } else {
          found = !results;
          callback();
        }
      });
    }
  };

  function callback(err) {
    if (err) {
      next(err);
    } else {
      if (opening_lines[curr_content_id]) {
        filter.add(user + curr_content_id, function (err) {
          if (err) {
            next(err);
          } else {
            res.send(opening_lines[curr_content_id]);
          }
        });
      } else {
        res.send('No new content!');
      }
    }
  }

  // loop using async
  async.whilst(isDone(), asynchIteratee(cb), callback(err));
});

// app.get('/check', function(req, res, next) {
//   // check query for username
//   if (typeof req.query.username === 'undefined') { 
//     next('route'); 
//   } else { 
//     // check the username from the query string
//     filter.contains(req.query.username, function(err, result) { 
//       if (err) { 
//         next(err);
//       } else { 
//         res.send({ 
//           username : req.query.username,  
//           status : result 
//             ? 'used' 
//             : 'free' 
//           }); 
//       }
//     }); 
//   }
// });
  
// app.get('/save', function(req, res, next) {
//   console.log(req.query.username)
//   if (typeof req.query.username === 'undefined') { 
//     next('route'); 
//   } else {
//     // check if username is in filter
//     filter.contains(req.query.username, function (err, result) {
//       if(err) {
//         console.log(err);
//         next(err);
//       } else {
//         if(result) { 
//           res.send({ 
//             username : req.query.username, 
//             status : 'not-created' 
//           }); 
//         } else { 
//           console.log("here");
//           // Add username to filter
//           filter.add(req.query.username, function(err, result) { 
//             if (err) { 
//               next(err); 
//             } else { 
//               res.send({ 
//                 username : req.query.username, 
//                 status : 'created' 
//               }); 
//             } 
//           }); 
//         } 
//       } 
//     }); 
//   } 
// });

app.listen(port, function() {
  console.log('Server started on port ' + port)
})