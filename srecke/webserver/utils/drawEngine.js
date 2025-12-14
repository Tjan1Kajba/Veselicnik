function pickPrize(prizes) {
  const total = prizes.reduce((sum, p) => sum + p.probability, 0);
  let random = Math.random() * total;

  for (const prize of prizes) {
    if (random < prize.probability) return prize;
    random -= prize.probability;
  }
}

exports.runDraw = (tickets, prizes) => {
  const winners = [];

  for (const ticket of tickets) {
    const prize = pickPrize(prizes);

    if (prize) {
      winners.push({
        ticketId: ticket._id,
        prizeId: prize._id,
      });
    }
  }

  return winners;
};
