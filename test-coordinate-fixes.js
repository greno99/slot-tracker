
// test-coordinate-fixes.js - Test all coordinate fixes

console.log('🧪 TESTING COORDINATE FIXES');
console.log('============================');

async function testCoordinateFixes() {
    console.log('\n1️⃣ Testing coordinate validation...');
    
    const testAreas = [
        { name: 'Valid area', area: { x: 100, y: 100, width: 50, height: 30 } },
        { name: 'Invalid area (negative)', area: { x: -10, y: 50, width: 50, height: 30 } },
        { name: 'Invalid area (missing props)', area: { x: 100, y: 100 } },
        { name: 'Your bet area', area: { x: 1356, y: 1079, width: 98, height: 42 } },
        { name: 'Your win area', area: { x: 962, y: 1078, width: 112, height: 48 } }
    ];
    
    testAreas.forEach(test => {
        console.log(`\n🎯 Testing: ${test.name}`);
        console.log(`   Area: ${JSON.stringify(test.area)}`);
        
        // Test coordinate validation logic
        const isValid = test.area.x && test.area.y && test.area.width && test.area.height &&
                        test.area.x >= 0 && test.area.y >= 0 && 
                        test.area.width > 0 && test.area.height > 0;
        
        console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
        
        if (isValid) {
            // Test offset application
            const offsetX = 10, offsetY = -20;
            const withOffset = {
                ...test.area,
                x: test.area.x + offsetX,
                y: test.area.y + offsetY
            };
            console.log(`   With offset (+${offsetX}, ${offsetY}): ${JSON.stringify(withOffset)}`);
        }
    });
    
    console.log('\n2️⃣ Testing coordinate flow simulation...');
    
    // Simulate the coordinate flow
    const manualInput = { x: 1356, y: 1079, width: 98, height: 42 };
    console.log(`Step 1 - Manual input: ${JSON.stringify(manualInput)}`);
    
    const withOffset = { 
        x: manualInput.x + 0,  // X offset
        y: manualInput.y + (-20),  // Y offset (fix "too high" issue)
        width: manualInput.width,
        height: manualInput.height 
    };
    console.log(`Step 2 - With offset: ${JSON.stringify(withOffset)}`);
    
    const browserRelative = {
        x: withOffset.x - 0,  // Browser window X
        y: withOffset.y - 30, // Browser window Y (including titlebar)
        width: withOffset.width,
        height: withOffset.height
    };
    console.log(`Step 3 - Browser relative: ${JSON.stringify(browserRelative)}`);
    
    console.log('\n3️⃣ Expected results:');
    console.log('   • Y coordinate changes should now work');
    console.log('   • Screenshots should capture at correct positions');
    console.log('   • No more "under and to the right" issues');
    
    console.log('\n✅ Coordinate fix test complete!');
}

testCoordinateFixes().catch(console.error);
