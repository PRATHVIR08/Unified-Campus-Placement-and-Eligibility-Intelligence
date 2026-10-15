// Offer Service Transaction Unit Tests [P2]
const { acceptOfferTransaction } = require('../src/services/offerService');

describe('Offer Service Transaction Tests', () => {
  test('should accept offer within transaction', async () => {
    const res = await acceptOfferTransaction('sample-offer-id', 'sample-student-id');
    expect(res.success).toBe(true);
  });
});
