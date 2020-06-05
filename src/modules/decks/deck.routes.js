import { Router } from 'express';
import passport from 'passport';

import * as deckController from './deck.controller';

const routes = new Router();
const authJwt = passport.authenticate('jwt', { session: false });

// Creates deck with just the main card and deck name
routes.post('/', authJwt, deckController.createDeck);

// Get user's decks
routes.get('/', authJwt, deckController.listDecks);

// Get a deck's decklist
routes.get('/:id', authJwt, deckController.decklist);

// Edit a deck
routes.patch('/:id', authJwt, deckController.editDeck);

// Delete a deck
routes.delete('/:id', authJwt, deckController.deleteDeck);

// Add to deck
routes.post('/:id/add', authJwt, deckController.addCards);

// Remove card from deck
routes.post('/:id/remove', authJwt, deckController.removeCard);

// Show community decks
routes.get('/list/all', authJwt, deckController.showAllDecks)


export default routes;
