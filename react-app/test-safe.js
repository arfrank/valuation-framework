// Manual verification test for uncapped SAFE calculations
// This confirms that SAFEs with cap=0 and discount>0 work correctly

import { calculateScenario } from './src/utils/calculations.js'

export const verifyUncappedSafeCalculations = () => {
  console.log('=== Verifying Uncapped SAFE Calculations ===')
  
  const testCases = [
    {
      name: 'Uncapped SAFE with 20% discount',
      inputs: {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        proRataPercent: 0,
        safes: [{
          id: 1,
          amount: 1,
          cap: 0,  // UNCAPPED
          discount: 20  // 20% discount
        }],
        preRoundFounderOwnership: 0
      },
      expectedConversionPrice: 8,  // 10M * (1 - 0.20) = 8M
      expectedSafePercent: 12.5    // 1M / 8M = 12.5%
    },
    {
      name: 'Uncapped SAFE with 50% discount',
      inputs: {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        proRataPercent: 0,
        safes: [{
          id: 1,
          amount: 2,
          cap: 0,  // UNCAPPED
          discount: 50  // 50% discount
        }],
        preRoundFounderOwnership: 0
      },
      expectedConversionPrice: 5,   // 10M * (1 - 0.50) = 5M
      expectedSafePercent: 40       // 2M / 5M = 40%
    }
  ]
  
  testCases.forEach(testCase => {
    console.log(`\n--- ${testCase.name} ---`)
    const result = calculateScenario(testCase.inputs)
    
    console.log('Pre-money:', result.preMoneyVal, 'M')
    console.log('SAFE amount:', result.totalSafeAmount, 'M')
    console.log('SAFE cap:', result.safeDetails[0]?.cap || 0, 'M (0 = uncapped)')
    console.log('SAFE discount:', result.safeDetails[0]?.discount || 0, '%')
    console.log('SAFE conversion price:', result.safeDetails[0]?.conversionPrice || 0, 'M')
    console.log('SAFE percentage:', result.totalSafePercent, '%')
    
    // Verify expectations
    const conversionMatch = result.safeDetails[0]?.conversionPrice === testCase.expectedConversionPrice
    const percentMatch = result.totalSafePercent === testCase.expectedSafePercent
    
    console.log('✅ Conversion price correct:', conversionMatch)
    console.log('✅ SAFE percentage correct:', percentMatch)
    
    if (!conversionMatch || !percentMatch) {
      console.error('❌ Test case failed!')
    }
  })
  
  console.log('\n=== Verification Complete ===')
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyUncappedSafeCalculations()
}