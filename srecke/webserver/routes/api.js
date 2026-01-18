const express = require("express");
const router = express.Router();

const Tickets = require("../controllers/tickets");
const Prizes = require("../controllers/prizes");
const Draws = require("../controllers/draws");

const authenticateToken = require("../middleware/authMiddleware.js");
const { requireAdmin } = require("../middleware/roleMiddleware");

/**
 * @swagger
 * tags:
 *   - name: Prizes
 *   - name: Tickets
 *   - name: Draws
 */



/* ================================
   TICKETS
   ================================ */

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Ustvari novo srečko 2
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               veselica_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Srečka ustvarjena
 */
router.post("/tickets", authenticateToken, Tickets.createTicket);


/**
 * @swagger
 * /ticketsAndMusicRequest:
 *   post:
 *     summary: Ustvari novo srečko in pošlje zahtevo za glasbo
 *     security:
 *       - bearerAuth: []
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
 *               veselica_id:
 *                 type: string
 *               songName:
 *                 type: string
 *                 example: "Starships"
 *               artist:
 *                 type: string
 *                 example: "Niki Minaj"
 *     responses:
 *       201:
 *         description: Ticket and music request created
 */

router.post("/ticketsAndMusicRequest", authenticateToken, Tickets.createTicketAndMusicRequest);




/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Seznam vseh kupljenih srečk
 *     security:
 *       - bearerAuth: []
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/tickets", authenticateToken, Tickets.getTickets);

/**
 * @swagger
 * /tickets/{id}:
 *   put:
 *     summary: Posodobi podatke o srečki
 *     security:
 *       - bearerAuth: []
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
router.put("/tickets/:id", authenticateToken, Tickets.updateTicket);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Izbriši srečko
 *     security:
 *       - bearerAuth: []
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
router.delete("/tickets/:id", authenticateToken, Tickets.deleteTicket);


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
 * /prizes/{id}:
 *   get:
 *     summary: Seznam vseh nagrad na doloceni veselici
 *     tags: [Prizes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/prizes/:id", Prizes.getPrizesOnVeselica);

/**
 * @swagger
 * /prizes:
 *   post:
 *     summary: Dodaj novo nagrado
 *     security:
 *       - bearerAuth: []
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
 *                 example: 0.1
 *               veselica_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Nagrada ustvarjena
 */
router.post("/prizes", authenticateToken, Prizes.createPrize);

/**
 * @swagger
 * /prizes/{id}:
 *   put:
 *     summary: Posodobi nagrado
 *     security:
 *       - bearerAuth: []
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
router.put("/prizes/:id", authenticateToken, Prizes.updatePrize);

/**
 * @swagger
 * /prizes/{id}:
 *   delete:
 *     summary: Izbriši nagrado
 *     security:
 *       - bearerAuth: []
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
router.delete("/prizes/:id", authenticateToken, Prizes.deletePrize);



/* ================================
   DRAWS
   ================================ */

/**
 * @swagger
 * /draws:
 *   get:
 *     summary: Seznam vseh žrebanj
 *     tags: [Draws]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/draws", Draws.getDraws);

/**
 * @swagger
 * /draws/{id_veselica}:
 *   post:
 *     summary: Ustvari novo žrebanje
 *     security:
 *       - bearerAuth: []
 *     tags: [Draws]
 *     parameters:
 *       - in: path
 *         name: id_veselica
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Žrebanje ustvarjeno
 */
router.post("/draws/:id_veselica", authenticateToken, requireAdmin, Draws.createDraw);

/**
 * @swagger
 * /draws/{id}/winners:
 *   get:
 *     summary: Prikaže zmagovalce žrebanja
 *     security:
 *       - bearerAuth: []
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
router.get("/draws/:id/winners", authenticateToken, Draws.getWinners);

/**
 * @swagger
 * /draws/{id}:
 *   delete:
 *     summary: Izbriši žrebanje
 *     security:
 *       - bearerAuth: []
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
router.delete("/draws/:id", authenticateToken, Draws.deleteDraw);

module.exports = router;
