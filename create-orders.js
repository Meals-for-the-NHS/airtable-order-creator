// Taken from https://community.airtable.com/t/create-recurring-orders/28661

const ordersTable = base.getTable('Recurring orders');
const deliveriesTable = base.getTable('Deliveries');

const orders = await ordersTable.selectRecordsAsync();

const dayOfWeekToNumber = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

for (const order of orders.records) {
    if (order.getCellValue('Deliveries')) {
        // Skip it, the deliveries were already created.
        continue;
    }

    const name = order.name;
    const startDateString = order.getCellValue('Start Date');
    const endDateString = order.getCellValue('End Date');
    const daysOfWeek = order.getCellValue('Days of week');

    if (!startDateString) {
        output.text(`⚠️ Skipping "${name}" because it doesn't have a start date.`);
        continue;
    }
    if (!endDateString) {
        output.text(`⚠️ Skipping "${name}" because it doesn't have an end date.`);
        continue;
    }
    if (!daysOfWeek) {
        output.text(`⚠️ Skipping "${name}" because it doesn't have any 'Days of week' to repeat.`);
        continue;
    }

    const daysOfWeekSet = new Set();
    for (const dayOfWeek of daysOfWeek) {
        if (!dayOfWeekToNumber.hasOwnProperty(dayOfWeek.name)) {
            throw new Error(`Unexpected day of week: ${dayOfWeek.name}`);
        }
        daysOfWeekSet.add(dayOfWeekToNumber[dayOfWeek.name]);
    }

    const endDate = getDateFromString(endDateString);
    let deliveriesToCreate = [];
    for (
        let currentDate = getDateFromString(startDateString);
        currentDate <= endDate;
        currentDate.setDate(currentDate.getDate() + 1)
    ) {
        if (daysOfWeekSet.has(currentDate.getDay())) {
            deliveriesToCreate.push({
                fields: {
                    Date: getStringFromDate(currentDate),
                    Restaurant: order.getCellValue('Restaurant'),
                    Hospital: order.getCellValue('Hospital'),
                    "Recurring order": [{id: order.id}],
                },
            });
        }
    }

    output.text(`Creating ${deliveriesToCreate.length} deliveries for "${name}".`);

    // Only up to 50 records can be created at one time, so do it in batches.
    while (deliveriesToCreate.length > 0) {
        await deliveriesTable.createRecordsAsync(deliveriesToCreate.slice(0, 50));
        deliveriesToCreate = deliveriesToCreate.slice(50);
    }
}

output.text('✅ Done!');

function getDateFromString(dateString) {
    // Assumes dateString is yyyy-mm-dd
    const parts = dateString.split('-').map(part => parseFloat(part));
    const date = new Date();
    date.setFullYear(parts[0]);
    date.setMonth(parts[1] - 1);
    date.setDate(parts[2]);
    date.setHours(0, 0, 0, 0);
    return date;
}

function getStringFromDate(date) {
    // Returns yyyy-mm-dd string.
    return [
        date.getFullYear(),
        (date.getMonth() + 1).toString().padStart(2, '0'),
        date.getDate().toString().padStart(2, '0'),
    ].join('-');
}
