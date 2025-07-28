// Manual verification test for uncapped SAFE calculations
// This confirms that safeCap=0 with safeDiscount>0 works correctly

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
        safeAmount: 1,
        safeCap: 0,  // UNCAPPED
        safeDiscount: 20,  // 20% discount
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
        safeAmount: 2,
        safeCap: 0,  // UNCAPPED
        safeDiscount: 50,  // 50% discount
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
    console.log('SAFE amount:', result.safeAmount, 'M')
    console.log('SAFE cap:', result.safeCap, 'M (0 = uncapped)')
    console.log('SAFE discount:', result.safeDiscount, '%')
    console.log('SAFE conversion price:', result.safeConversionPrice, 'M')
    console.log('SAFE percentage:', result.safePercent, '%')
    
    // Verify expectations
    const conversionMatch = result.safeConversionPrice === testCase.expectedConversionPrice
    const percentMatch = result.safePercent === testCase.expectedSafePercent
    
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