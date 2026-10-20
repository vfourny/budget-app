import { allocateRefunds } from '@shared/professional/allocate-refunds.util'
import { expect, it } from 'vitest'

it('settles dues in order and puts any overpayment on the last one', () => {
  expect(allocateRefunds(150, [100, 30])).toEqual([100, 50])
  expect(allocateRefunds(50, [100, 30])).toEqual([50, 0])
  expect(allocateRefunds(50, [])).toEqual([])
})
