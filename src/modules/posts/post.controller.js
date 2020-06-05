import HTTPStatus from 'http-status';
import nodemailer from 'nodemailer';
import Mixpanel from 'mixpanel';
import Post from './post.model';
import User from '../users/user.model';
import Search from '../logs/search.model';
import constants from '../../config/constants';

const mixpanel = Mixpanel.init(constants.MIXPANEL_KEY);

// create reusable transporter object using the default SMTP transport


/* HELPER FUNCTIONS
 *
 * Functions that help the controller's functions
*/
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/* TESTED
 * POST /api/v1/posts/
 *
 * Creates product post
*/
export async function createPost(req, res) {
  // console.log('run')
  try {
    const post = await new Post();
    post.name = req.body.name;
    post.text = req.body.text;
    post.rarity = req.body.rarity;
    post.cardNumber = req.body.cardNumber;
    post.cardType = req.body.cardType;
    post.symbol = req.body.symbol; // array
    post.jutsuCost = req.body.jutsuCost; // array
    post.characteristic = req.body.characteristic; // array
    post.handCost = req.body.handCost;
    post.entranceCost = req.body.entranceCost;
    post.effectName = req.body.effectName;
    post.combatAttr = req.body.combatAttr;
    post.healthy = req.body.healthy;
    post.injured = req.body.injured;
    post.image = req.file.path;
    post.cardSet = req.body.cardSet
    // req.file.forEach(file => {
    //   post.image.push(file.path);
    // });
    await post.save();
    return res.status(HTTPStatus.CREATED).json(post.toJSON());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}
/* TESTED
 * GET /api/v1/posts/:id
 *
 * Get a CARD with a certain id 
*/
export async function getPostById(req, res) {
  try {
    const promise = await Promise.all([
      User.findById(req.user._id),
      Post.findById(req.params.id).populate({path: 'owned.user', populate: { path: 'user', model: 'User'}}).populate({path: 'wanted.user', populate: { path: 'user', model: 'User'}})
    ]);
    const post = promise[1];
    

    return res.status(HTTPStatus.OK).json(
      post.toJSON(),
    );
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}
/* TESTED
 * GET /api/v1/posts/?title
 *
 * Search for posts based on how recent they are
 * 
 * filters: {
 * name: string,
 * type: string,
 * symbol: string,
 * rarity: string, has a space before string, cannot do regex IMPORTANT!!!!!!!!!!!
 * combatAttr: string,
 * entranceCost: number,
 * cardSet: string
 * }
*/
export async function getPostsList(req, res) {
  try {
    let noMatch = null;
    if (req.query.search || req.query.type || req.query.symbol || req.query.rarity || req.query.combatAttr || 
      req.query.entranceCost || req.query.cardSet || req.query.characteristic || req.query.cardEffect) { // search by everything
      let _query = {};
      if (req.query.search) {
        let regex = new RegExp(escapeRegex(req.query.search), 'gi');
        _query.name = regex;
      }
      if (req.query.type) {
        let _type = new RegExp(escapeRegex(req.query.type), 'gi');
        _query.cardType = _type;
        
      }
      if (req.query.symbol) {
        let _symbol = new RegExp(escapeRegex(req.query.symbol), 'gi');
        _query.symbol = _symbol;
        
      }
      if (req.query.rarity) {
        let _rarity = req.query.rarity;
        _query.rarity = _rarity;
      }
      if (req.query.combatAttr) {
        let _combatAttr = new RegExp(escapeRegex(req.query.combatAttr), 'gi');
        _query.combatAttr = _combatAttr;
      }
      if (req.query.entranceCost) {
        let _entranceCost = Number(req.query.entranceCost)
        _query.entranceCost = _entranceCost;
      }
      if (req.query.cardSet) {
        let _cardSet = new RegExp(escapeRegex(req.query.cardSet), 'gi');
        _query.cardSet = _cardSet;
      }

      if (req.query.characteristic) {
        let charset = req.query.characteristic.split(" ");
        
        if (charset.length > 1) {
          let objCharArr = [];
          charset.forEach(characteristic => {
            let _characteristic = new RegExp(escapeRegex(characteristic), 'gi');
            objCharArr.push({ "characteristic": _characteristic});
          });
          _query["$and"] = objCharArr;
        } else {
          let _characteristic = new RegExp(escapeRegex(req.query.characteristic), 'gi');
          _query.characteristic = _characteristic;
        }
      }
      if (req.query.cardEffect) {
        let advQuery = [];
        let _text = new RegExp(escapeRegex(req.query.cardEffect), 'gi');
        advQuery.push({"text" : _text});
        advQuery.push({"effectName": _text});
          _query["$or"] = advQuery;
      }
      
      let promise = await Promise.all([
        Post.find(_query).sort({ name: 1 }),
      ]);
      
      
      const posts = promise[0].reduce((arr, post) => {
        arr.push(
          post.toJSON(),
        );

        return arr;
      }, []);
      if (posts.length < 1) {
        noMatch = 'No cards match that search, please try again.';
      }


      // Logs can't take fiat
      if (req.query.characteristic) {
        let splitChar = req.query.characteristic.split(" ");
        if (splitChar.length > 1) {
          Object.defineProperty(_query, "characteristicsArr",
          Object.getOwnPropertyDescriptor(_query, "$and"));
          delete _query["$and"];
        }
      }
      if (req.query.cardEffect) {
          Object.defineProperty(_query, "effectText",
          Object.getOwnPropertyDescriptor(_query, "$or"));
          delete _query["$or"];
      }
      
      const log = await new Search();
      log.user = req.user._id;
      log.query = new Object(_query);
      await log.save();
      mixpanel.people.set(req.user.name, {
        $distinct_id: req.user.userName,
        $name: req.user.name,
        $username: req.user.userName,
        $email: req.user.email,
        $createdAt: req.user.createdAt,
        $last_login: new Date(),
      });
      mixpanel.track('Search', {
        distinct_id: req.user.userName,
        search: req.query.search,
        type: req.query.type,
        symbol: req.query.symbol,
        rarity: req.query.rarity,
        combatAttr: req.query.combatAttr,
        entranceCost: req.query.entranceCost,
        cardSet: req.query.cardSet
      });

      return res.status(HTTPStatus.OK).json({
        posts,
        result: noMatch,
      });
    } else {
      const limit = parseInt(req.query.limit, 0);
      const skip = parseInt(req.query.skip, 0);
      const promise = await Promise.all([
        Post.list({ skip, limit }),
      ]);

      const posts = promise[0].reduce((arr, post) => {
       mixpanel.identify()

        arr.push(
          post.toJSON(),
        );

        return arr;
      }, []);
      return res.status(HTTPStatus.OK).json({
        posts,
        noResult: noMatch,
      });
    }
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/* 
 * PATCH /api/v1/posts/:id
 *
 * Updates a certain card's prices and % change
 * 
 * NOT REQUIRED FOR NARUTOCCG
*/
// export async function updateCard(req, res) {
//   try {
//     const card = await Post.findById(req.params.id);
//     card.lowPrice = req.body.lowPrice;
//     card.avgPrice = req.body.avgPrice;
//     card.highPrice = req.body.highPrice;
//     card.dayChange = req.body.dayChange;
//     card.weekChange = req.body.weekChange;
//     card.monthChange = req.body.monthChange;
//     card.quarterChange = req.body.quarterChange;
//     card.semiChange = req.body.semiChange;
//     card.annualChange = req.body.annualChange;

//     return res.status(HTTPStatus.OK).json(await card.save());
//   } catch (e) {
//     return res.status(HTTPStatus.BAD_REQUEST).json(e);
//   }
// }

/* TESTED
 * POST /api/v1/posts/:id/collect
 *
 * needs card object ID
 * User adds card to their collection
 * asked how many they have == post.owned.amount
 * asked what they value the card at == post.owned.value
 * by whom == post.owned.user
*/
export async function collectCard(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (req.body.amount && req.body.value && req.body.forSale) {
      post.owned.push({
        amount: req.body.amount,
        value: req.body.value,
        user: req.user._id,
        forSale: req.body.forSale
      });
    } else {
      post.owned.push({
        amount: req.body.amount,
        value: req.body.value,
        user: req.user._id
      });
    }
    await post.save();
    mixpanel.track('Add to Collection', {
      distinct_id: req.user.userName,
      card: post.name
    });
    return res.status(HTTPStatus.CREATED).json(post.toJSON());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}
/* TESTED
 * GET /api/v1/posts/:id/uncollect
 *
 * needs card object ID
 * User adds card to their collection
 * asked how many they have == post.owned.amount
 * asked what they value the card at == post.owned.value
 * by whom == post.owned.user
*/
export async function uncollectCard(req, res) {
  try {
    await Post.updateOne({ _id: req.params.id}, { $pull: { owned: { user: req.user._id } } })
    const post = await Post.findById(req.params.id);
    // await post.save();
    return res.status(HTTPStatus.CREATED).json(post.toJSON());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/**
 * TESTED
 * GET /api/v1/posts/:id/sale
 * @user_ID {*} ObjectID
 * @forSale {*} Boolean 
 * 
 * Get a user's collected card and change sale state.
 */
export async function cardState(req, res) {
  try {
    const post = await Post.findById(req.params.id); 
    const ownIndex = post.owned.findIndex((ownership => String(ownership.user) === String(req.user._id)));

    // console.log("before update: ", post.owned[ownIndex]);
    const currentState = post.owned[ownIndex].forSale;
    if (currentState == true) {
      post.owned[ownIndex].forSale = false;
    } else {
      post.owned[ownIndex].forSale = true;
    }
    // console.log("after update: ", post.owned[ownIndex]);
    await post.save();

    return res.status(HTTPStatus.CREATED).json(post.owned[ownIndex]);
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}
/* TESTED
 * POST /api/v1/posts/:id/want
 *
 * needs card object ID
 * User adds card to their want list
 * asked how many they have == post.wanted.amount
 * asked what they value the card at == post.wanted.value
 * by whom == post.wanted.user
*/
export async function wantCard(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    post.wanted.push({
      amount: req.body.amount,
      value: req.body.value,
      user: req.user._id
    });
    await post.save();
    mixpanel.track('Add to Want List', {
      distinct_id: req.user.userName,
      card: post.name
    });
    return res.status(HTTPStatus.CREATED).json(post.toJSON());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}
/* TESTED
 * GET /api/v1/posts/:id/unwant
 *
 * needs card object ID
 * User removes card to their want list
 * asked how many they want == post.wanted.amount
 * asked what they value the card at == post.wanted.value
 * by whom == post.wanted.user
*/
export async function unwantCard(req, res) {
  try {
    await Post.updateOne({ _id: req.params.id}, { $pull: { wanted: { user: req.user._id } } })
    const post = await Post.findById(req.params.id);
    // await post.save();
    return res.status(HTTPStatus.CREATED).json(post.toJSON());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/**
 * TESTED
 *  
 * GET /api/v1/posts/list/view
 */

 export async function bannedList(req, res) {
   try {
     const banned = await Post.find({ image: {$in : 
      ["uploads/2019-02-25T04:24:00.741Z WWN-1241.jpg",
      "uploads/2019-02-25T04:04:34.369Z STN-1108.jpg",
      "uploads/2019-02-25T04:04:38.636Z STN-1110.jpg",
      "uploads/2019-02-24T05:27:28.754Z FPN-678.jpg",
      "uploads/2019-02-24T15:59:48.677Z FotSN-902.jpg",
      "uploads/2019-02-25T04:57:24.088Z UNS3N-1621.jpg",
      "uploads/2019-02-25T04:22:52.218Z WWN-1207.jpg",
      "uploads/2019-02-25T04:30:27.667Z IN-1294.jpg",
      "uploads/2019-04-12T03:28:40.723Z EAN-615.jpg",
      "uploads/2019-02-24T05:21:24.681Z FRN-567.jpg",
      "uploads/2019-02-24T04:55:27.161Z LOLN-US118.jpg",
      "uploads/2019-02-24T04:55:39.138Z LOLN-US124.jpg",
      "uploads/2019-02-24T04:55:35.161Z LOLN-US122.jpg",
      "uploads/2019-02-24T05:54:30.462Z WOFN-861.jpg",
      "uploads/2019-02-24T05:20:00.406Z FRN-522.jpg",
      "uploads/2019-04-12T03:39:01.657Z EAN-591.jpg",
      "uploads/2019-02-24T04:55:37.166Z LOLN-US123.jpg",
      "uploads/2019-02-25T04:38:41.059Z SLN-1373.jpg",
      "uploads/2019-02-24T16:00:53.148Z FotSN-934.jpg",
      "uploads/2019-04-12T03:42:35.926Z EAN-634.jpg",
      "uploads/2019-02-25T04:58:54.345Z UNS3N-1654.jpg",
      "uploads/2019-04-12T03:51:50.335Z EAN-636.jpg",
      "uploads/2019-02-24T16:00:28.819Z FotSN-922.jpg",
      "uploads/2019-02-24T04:53:14.952Z LOLN-348.jpg",
      "uploads/2019-02-24T05:32:58.229Z BPN-717.jpg",
      "uploads/2019-02-24T05:26:42.616Z FPN-655.jpg",
      "uploads/2019-02-24T05:30:27.099Z FPJ-549.jpg",
      "uploads/2019-02-24T15:42:38.099Z TP1J-696.jpg",
      "uploads/2019-02-25T03:59:49.058Z TGSJ-788.jpg",
      "uploads/2019-02-24T05:37:54.650Z BPJ-638.jpg",
      "uploads/2019-02-24T05:37:52.775Z BPJ-637.jpg",
      "uploads/2019-02-25T04:09:17.147Z STJ-820.jpg",
      "uploads/2019-02-24T05:18:01.455Z ANCJ-435.jpg",
      "uploads/2019-02-24T05:37:12.689Z BPJ-618.jpg",
      "uploads/2019-04-12T04:01:48.585Z EAJ-529.jpg",
      "uploads/2019-02-22T22:03:09.212Z COSJ-074.jpg",
      "uploads/2019-04-12T04:03:52.530Z EAJ-521.jpg",
      "uploads/2019-02-24T05:05:07.392Z LOLJ-332.jpg",
      "uploads/2019-02-24T05:23:30.670Z FRM-452.jpg",
      "uploads/2019-02-24T05:47:24.622Z WOFM-647.jpg",
      "uploads/2019-02-25T16:47:37.673Z PR-092.jpg",
      "uploads/2019-04-12T04:06:51.858Z EAM-494.jpg",
      "uploads/2019-05-11T19:14:28.598Z EAM-486.jpg",
      "uploads/2019-02-22T22:20:36.541Z CUSM-125.jpg",
      "uploads/2019-04-12T04:09:38.622Z EAM-492.jpg",
      "uploads/2019-02-22T22:59:27.593Z DLC-026.jpg",
      "uploads/2019-02-24T05:12:00.422Z AWC-043.jpg",
      "uploads/2019-02-24T05:32:15.352Z FPC-051.jpg",
    ]}});
    const limited = await Post.find({ image: { $in: [
      "uploads/2019-02-24T05:13:32.959Z ANCN-487.jpg",
       "uploads/2019-02-25T04:03:27.160Z TGSN-1089.jpg",
       "uploads/2019-02-22T20:38:53.266Z AWN-1491.jpg",
       "uploads/2019-02-25T16:47:36.983Z PR-052.jpg",
       "uploads/2019-02-25T04:51:15.401Z HAN-1576.jpg",
       "uploads/2019-02-24T05:12:40.957Z ANCN-461.jpg",
       "uploads/2019-02-25T03:55:49.009Z TP2N-871.jpg",
       "uploads/2019-02-25T16:56:07.481Z PR-100.jpg",
       "uploads/2019-02-25T16:47:36.612Z PR-053.jpg",
       "uploads/2019-02-25T04:23:18.342Z WWN-1220.jpg",
       "uploads/2019-02-25T03:43:50.259Z POPN-1005.jpg",
       "uploads/2019-02-24T05:26:22.669Z FPN-645.jpg",
       "uploads/2019-04-12T23:28:09.329Z EAN-630.jpg",
       "uploads/2019-02-24T05:37:48.742Z BPJ-635.jpg",
       "uploads/2019-02-25T04:07:44.442Z STJ-808.jpg",
       "uploads/2019-02-24T05:37:58.787Z BPJ-640.jpg",
       "uploads/2019-02-25T04:55:53.815Z UNS3J-1012.jpg",
       "uploads/2019-02-25T04:00:06.718Z TGSJ-797.jpg",
       "uploads/2019-02-25T03:57:39.249Z TP2J-704.jpg",
       "uploads/2019-02-24T15:57:36.403Z FotSJ-725.jpg",
       "uploads/2019-02-25T04:08:04.561Z STJ-818.jpg",
       "uploads/2019-02-24T05:36:58.600Z BPJ-611.jpg",
       "uploads/2019-02-24T05:31:43.205Z FPJ-587.jpg",
       "uploads/2019-04-12T23:36:14.215Z EAJ-536.jpg",
       "uploads/2019-02-24T05:23:20.714Z FRM-447.jpg",
       "uploads/2019-02-25T04:00:46.649Z TGSM-738.jpg",
       "uploads/2019-02-24T04:56:29.270Z LOLM-309.jpg",
       "uploads/2019-02-24T05:29:47.002Z FPM-538.jpg",
       "uploads/2019-02-25T04:12:10.491Z TP3M-785.jpg",
       "uploads/2019-02-25T04:53:29.533Z HAM-965.jpg",
       "uploads/2019-02-24T05:46:40.551Z WOFM-625.jpg",
       "uploads/2019-02-25T04:53:01.997Z HAM-951.jpg",
       "uploads/2019-02-22T22:19:11.040Z CUSM-106.jpg",
       "uploads/2019-02-25T04:53:27.547Z HAM-964.jpg",
       "uploads/2019-02-25T03:44:24.015Z POPM-714.jpg",
       "uploads/2019-02-24T05:22:46.659Z FRM-430.jpg",
       "uploads/2019-02-25T04:00:18.664Z TGSM-723.jpg",
       "uploads/2019-02-22T22:27:12.873Z RARC-015.jpg",
   ]}});

    const semiLim = await Post.find({ image: { $in : [
      "uploads/2019-02-25T04:05:46.466Z STN-1144.jpg",
       "uploads/2019-02-25T04:10:10.930Z TP3N-1181.jpg",
       "uploads/2019-02-25T04:56:27.942Z UNS3J-1029.jpg",
       "uploads/2019-02-25T04:26:00.774Z WWJ-841.jpg",
       "uploads/2019-02-24T04:57:07.365Z LOLM-US093.jpg",
       "uploads/2019-02-25T04:35:38.986Z TP4M-848.jpg",
       "uploads/2019-02-24T05:23:12.642Z FRM-443.jpg",
       "uploads/2019-02-24T05:06:05.573Z LOLC-035.jpg",
   ]}});
    return res.status(HTTPStatus.OK).json({
      banned: banned,
      limited: limited,
      semiLim: semiLim
    });
   } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
   }
 }

/**
 * TESTED
 * 
 * GET /api/v1/posts/list/erratas
 */
export async function erratas(req, res) {
  try {
    const erratas = await Post.find({ name : "Errata"});

    return res.status(HTTPStatus.OK).json({
      erratas: erratas
    })
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/**
 * NOT TESTED
 * 
 * GET /api/v1/posts/list/wanted
 */
export async function wantedCards(req, res) {
  try {
    const wantedCards = await Post.find({ "wanted.0": { $exists: true} }).populate({path: 'wanted.user', populate: { path: 'user', model: 'User'}});
    mixpanel.track('View Wanted Cards', {
      distinct_id: req.user.userName,
    });
    return res.status(HTTPStatus.OK).json(wantedCards);
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/**
 * NOT TESTED
 * 
 * GET /api/v1/posts/list/owned
 */
export async function ownedCards(req, res) {
  try {
    const ownedCards = await Post.find({ "owned.0" : { $exists: true } }).populate({path: 'owned.user', populate: { path: 'user', model: 'User'}});
    mixpanel.track('View Owned Cards', {
      distinct_id: req.user.userName,
    });
    return res.status(HTTPStatus.OK).json(ownedCards)
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

