const express = require("express");
const router = express.Router();

const Tickets = require("../controllers/tickets");
const Prizes = require("../controllers/prizes");
const Draws = require("../controllers/draws");

/**
 * @swagger
 * tags:
 *   - name: Tickets
 *   - name: Prizes
 *   - name: Draws
 */

/* ================================
   TICKETS
   ================================ */

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Ustvari novo srečko
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Srečka ustvarjena
 */
router.post("/tickets", Tickets.createTicket);


/**
 * @swagger
 * /ticketsAndMusicRequest:
 *   post:
 *     summary: Ustvari novo srečko in pošlje zahtevo za glasbo
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - songName
 *               - artist
 *             properties:
 *               userId:
 *                 type: string
 *               songName:
 *                 type: string
 *               artist:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket and music request created
 */

router.post("/ticketsAndMusicRequest", Tickets.createTicketAndMusicRequest);




/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Seznam vseh kupljenih srečk
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/tickets", Tickets.getTickets);

/**
 * @swagger
 * /tickets/{id}:
 *   put:
 *     summary: Posodobi podatke o srečki
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Srečka posodobljena
 *       404:
 *         description: Srečka ne obstaja
 */
router.put("/tickets/:id", Tickets.updateTicket);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Izbriši srečko
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Izbrisano
 *       404:
 *         description: Srečka ne obstaja
 */
router.delete("/tickets/:id", Tickets.deleteTicket);



/* ================================
   PRIZES
   ================================ */

/**
 * @swagger
 * /prizes:
 *   get:
 *     summary: Seznam vseh nagrad
 *     tags: [Prizes]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/prizes", Prizes.getPrizes);

/**
 * @swagger
 * /prizes:
 *   post:
 *     summary: Dodaj novo nagrado
 *     tags: [Prizes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, probability]
 *             properties:
 *               name:
 *                 type: string
 *               probability:
 *                 type: number
 *     responses:
 *       201:
 *         description: Nagrada ustvarjena
 */
router.post("/prizes", Prizes.createPrize);

/**
 * @swagger
 * /prizes/{id}:
 *   put:
 *     summary: Posodobi nagrado
 *     tags: [Prizes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               probability:
 *                 type: number
 *     responses:
 *       200:
 *         description: Posodobljeno
 *       404:
 *         description: Nagrada ne obstaja
 */
router.put("/prizes/:id", Prizes.updatePrize);

/**
 * @swagger
 * /prizes/{id}:
 *   delete:
 *     summary: Izbriši nagrado
 *     tags: [Prizes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Izbrisano
 *       404:
 *         description: Nagrada ne obstaja
 */
router.delete("/prizes/:id", Prizes.deletePrize);



/* ================================
   DRAWS
   ================================ */

/**
 * @swagger
 * /draws:
 *   post:
 *     summary: Ustvari novo žrebanje
 *     tags: [Draws]
 *     responses:
 *       201:
 *         description: Žrebanje ustvarjeno
 */
router.post("/draws", Draws.createDraw);

/**
 * @swagger
 * /draws/{id}/winners:
 *   get:
 *     summary: Prikaže zmagovalce žrebanja
 *     tags: [Draws]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Seznam zmagovalcev
 *       404:
 *         description: Žrebanje ne obstaja
 */
router.get("/draws/:id/winners", Draws.getWinners);

/**
 * @swagger
 * /draws/{id}:
 *   delete:
 *     summary: Izbriši žrebanje
 *     tags: [Draws]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Izbrisano
 *       404:
 *         description: Ne obstaja
 */
router.delete("/draws/:id", Draws.deleteDraw);

module.exports = router;
