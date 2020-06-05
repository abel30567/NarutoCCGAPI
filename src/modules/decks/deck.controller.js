import HTTPStatus from 'http-status';
import Mixpanel from 'mixpanel';
import Card from '../posts/post.model';
import Deck from './deck.model';
import constants from '../../config/constants';

const mixpanel = Mixpanel.init(constants.MIXPANEL_KEY);
/* TESTED
 * POST /api/v1/decks/
 *
 * Creates a new deck
*/
export async function createDeck(req, res) {
    try {
        const deck = await new Deck();
        deck.name = req.body.name;
        deck.image = req.body.image;
        deck.user = req.user._id;
        await deck.save();
        return res.status(HTTPStatus.CREATED).json(deck.toJSON())
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e);
    }
}

/* TESTED
 * GET /api/v1/decks/
 *
 * Find user's created decks
*/

export async function listDecks(req, res) {
    try {
        const decks = await Deck.find({ user: req.user._id }).populate('deck');
        return res.status(HTTPStatus.CREATED).json(decks);
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e);
    }
}

/* TESTED
 * GET /api/v1/decks/:id
 *
 * List a decklist from a deck
*/
export async function decklist(req, res) {
    try {
        
        const promise = await Promise.all([
            Deck.findById(req.params.id).populate('deck')
        ]);
        const deck = promise[0];
        mixpanel.track('View Deck', {
            distinct_id: req.user.userName,
            _deck: deck.name
        });
        return res.status(HTTPStatus.OK).json(deck.toJSON());
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e);
    }
}

/* TESTED
 * POST /api/v1/decks/:id/add
 *
 * Add cards to a deck (2, objectID)
 * card: ObjectId (string)
 * times: number
*/

export async function addCards(req, res) {
    try {
        const deck = await Deck.findById(req.params.id).populate('deck');
        const card = await Card.findById(req.body.card)
        let times = Number(req.body.times);
        for (let i = 0; i < times; i++) {
            deck.deck.push(card)
        }
        return res.status(HTTPStatus.CREATED).json(await deck.save());
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e);
    }
}

/* TESTED
 * POST /api/v1/decks/:id/remove
 *
 * remove card from deck
 * card: ObjectId (string)
*/

export async function removeCard(req, res) {
    try {
        const deck = await Deck.findById(req.params.id).populate('deck');
        const card = await Card.findById(req.body.card);
        let count = 0;
        deck.deck.forEach(_card => {
            if (String(_card._id) === req.body.card) {
                count += 1;
            }
        });
        let add = count - 1; 
        deck.deck.pull(req.body.card);
        for (let i = 0; i < add; i++) {
            deck.deck.push(card)
        }
        
        return res.status(HTTPStatus.CREATED).json(await deck.save());
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e);
    }
}

/**
 * TESTED
 * GET /api/v1/decks/list/all
 */

 export async function showAllDecks(req, res) {
     try {
         const decks = await Deck.find({ $where: 'this.deck.length > 50'}).sort({ createdAt: -1 }).populate('user');
         return res.status(HTTPStatus.OK).json(decks);
     } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e);
         
     }
 }

 /**
  * NOT TESTED
  * PATCH /api/v1/decks/:id
  */
 export async function editDeck(req, res) {
     try {
        const promise = await Promise.all([
            Deck.findById(req.params.id).populate('deck')
        ]);
        const deck = promise[0];
        deck.name = req.body.name;
        deck.image = req.body.image;
        await deck.save();
        return res.status(HTTPStatus.OK).json(deck.toJSON())
     } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e);
     }
 }

 /**
  * NOT TESTED
  * DELETE /api/v1/decks/:id
  */
 export async function deleteDeck(req, res) {
    try {
       const promise = await Promise.all([
           Deck.findById(req.params.id).populate('deck')
       ]);
       const deck = promise[0];
       
       await deck.remove();
       return res.status(HTTPStatus.OK).json('Successful Delete')
    } catch (e) {
       return res.status(HTTPStatus.BAD_REQUEST).json(e);
    }
}
