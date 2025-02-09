import React from 'react';
import RepairForm from './components/RepairForm';

function App() {
    return (
        <div className="min-h-screen bg-gray-100 py-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">
                    Repair Service Report
                </h1>
                <RepairForm />
            </div>
        </div>
    );
}

export default App; 