class ValuationFramework {
    constructor() {
        this.companies = {};
        this.activeCompany = 'company1';
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.calculateScenarios(this.activeCompany);
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.company);
            });
        });

        // Calculate buttons
        document.getElementById('calculate').addEventListener('click', () => {
            this.calculateScenarios('company1');
        });
        document.getElementById('calculate-2').addEventListener('click', () => {
            this.calculateScenarios('company2');
        });
        document.getElementById('calculate-3').addEventListener('click', () => {
            this.calculateScenarios('company3');
        });

        // Input change listeners for auto-save
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', () => {
                this.saveToStorage();
            });
        });
    }

    switchTab(companyId) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-company="${companyId}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(companyId).classList.add('active');

        this.activeCompany = companyId;
        this.calculateScenarios(companyId);
    }

    getInputValues(companyId) {
        const suffix = companyId === 'company1' ? '' : `-${companyId.slice(-1)}`;
        return {
            preMoneyVal: parseFloat(document.getElementById(`pre-money-val${suffix}`).value) || 0,
            roundSize: parseFloat(document.getElementById(`round-size${suffix}`).value) || 0,
            lsvpPortion: parseFloat(document.getElementById(`lsvp-portion${suffix}`).value) || 0,
            otherPortion: parseFloat(document.getElementById(`other-portion${suffix}`).value) || 0
        };
    }

    calculateScenarios(companyId) {
        const inputs = this.getInputValues(companyId);
        const scenarios = this.generateScenarios(inputs);
        this.renderScenarios(scenarios, companyId);
        this.saveToStorage();
    }

    generateScenarios(baseInputs) {
        const scenarios = [];
        
        // Base scenario
        scenarios.push(this.calculateScenario(baseInputs));

        // Variations
        const variations = [
            { roundSize: baseInputs.roundSize + 0.25, lsvpPortion: baseInputs.lsvpPortion + 0.25 },
            { roundSize: baseInputs.roundSize - 0.25, lsvpPortion: baseInputs.lsvpPortion - 0.25 },
            { preMoneyVal: baseInputs.preMoneyVal + 1, roundSize: baseInputs.roundSize },
            { preMoneyVal: baseInputs.preMoneyVal - 1, roundSize: baseInputs.roundSize },
            { roundSize: baseInputs.roundSize + 0.5, lsvpPortion: baseInputs.lsvpPortion },
            { roundSize: baseInputs.roundSize - 0.5, lsvpPortion: baseInputs.lsvpPortion }
        ];

        variations.forEach(variation => {
            const scenarioInputs = { ...baseInputs, ...variation };
            if (variation.lsvpPortion === undefined) {
                scenarioInputs.otherPortion = scenarioInputs.roundSize - scenarioInputs.lsvpPortion;
            }
            scenarios.push(this.calculateScenario(scenarioInputs));
        });

        return scenarios;
    }

    calculateScenario(inputs) {
        const { preMoneyVal, roundSize, lsvpPortion, otherPortion } = inputs;
        const postMoneyVal = preMoneyVal + roundSize;
        
        // Calculate percentages
        const roundPercent = (roundSize / postMoneyVal) * 100;
        const lsvpPercent = (lsvpPortion / postMoneyVal) * 100;
        const otherPercent = (otherPortion / postMoneyVal) * 100;
        const totalPercent = roundPercent;

        return {
            roundSize: roundSize,
            roundPercent: roundPercent,
            lsvpAmount: lsvpPortion,
            lsvpPercent: lsvpPercent,
            otherAmount: otherPortion,
            otherPercent: otherPercent,
            totalAmount: roundSize,
            totalPercent: totalPercent,
            preMoneyVal: preMoneyVal,
            postMoneyVal: postMoneyVal
        };
    }

    renderScenarios(scenarios, companyId) {
        const suffix = companyId === 'company1' ? '' : `-${companyId.slice(-1)}`;
        const grid = document.getElementById(`scenarios-grid${suffix}`);
        
        grid.innerHTML = '';

        scenarios.forEach((scenario, index) => {
            const scenarioDiv = document.createElement('div');
            scenarioDiv.className = `scenario scenario-${index % 5}`;
            
            scenarioDiv.innerHTML = `
                <table class="scenario-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>$</th>
                            <th>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Round</td>
                            <td>${scenario.roundSize.toFixed(2)}</td>
                            <td>${scenario.roundPercent.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <td>LSVP</td>
                            <td>${scenario.lsvpAmount.toFixed(2)}</td>
                            <td>${scenario.lsvpPercent.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <td>Other</td>
                            <td>${scenario.otherAmount.toFixed(2)}</td>
                            <td>${scenario.otherPercent.toFixed(2)}%</td>
                        </tr>
                        <tr class="total-row">
                            <td>Total</td>
                            <td>${scenario.totalAmount.toFixed(2)}</td>
                            <td>${scenario.totalPercent.toFixed(2)}%</td>
                        </tr>
                    </tbody>
                </table>
                <div class="valuation-info">
                    <div>Pre Money: ${scenario.preMoneyVal.toFixed(1)}</div>
                    <div>Post Money: ${scenario.postMoneyVal.toFixed(2)}</div>
                </div>
            `;
            
            grid.appendChild(scenarioDiv);
        });
    }

    saveToStorage() {
        const data = {};
        ['company1', 'company2', 'company3'].forEach(companyId => {
            data[companyId] = this.getInputValues(companyId);
        });
        localStorage.setItem('valuationFramework', JSON.stringify(data));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('valuationFramework');
        if (stored) {
            const data = JSON.parse(stored);
            
            Object.keys(data).forEach(companyId => {
                const values = data[companyId];
                const suffix = companyId === 'company1' ? '' : `-${companyId.slice(-1)}`;
                
                if (document.getElementById(`pre-money-val${suffix}`)) {
                    document.getElementById(`pre-money-val${suffix}`).value = values.preMoneyVal || 10;
                    document.getElementById(`round-size${suffix}`).value = values.roundSize || 3;
                    document.getElementById(`lsvp-portion${suffix}`).value = values.lsvpPortion || 2.75;
                    document.getElementById(`other-portion${suffix}`).value = values.otherPortion || 0.75;
                }
            });
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ValuationFramework();
});