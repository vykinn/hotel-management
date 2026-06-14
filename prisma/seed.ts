import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding test data...');

  // 1. Delete all existing records
  await prisma.stockTakeItem.deleteMany();
  await prisma.stockTakeSession.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.wastageLog.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.cleanChecklist.deleteMany();

  await prisma.goodsReceivedNoteItem.deleteMany();
  await prisma.goodsReceivedNote.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.store.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.property.deleteMany();
  await prisma.organization.deleteMany();

  console.log('Cleared database.');

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Hestia Grand Resorts',
      deptManagerLimit: 25000,
      genManagerLimit: 100000
    }
  });

  // 3. Create Property
  const property = await prisma.property.create({
    data: {
      name: 'Goa Beachfront Resort & Spa',
      organizationId: org.id
    }
  });

  // 4. Create Users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@hestia.com',
      password: hashedPassword,
      name: 'Vivek Kumar (Owner)',
      role: 'HOTEL_OWNER',
      organizationId: org.id,
      propertyId: property.id
    }
  });

  const chefPassword = await bcrypt.hash('chef123', 10);
  const chef = await prisma.user.create({
    data: {
      email: 'chef@hestia.com',
      password: chefPassword,
      name: 'Chef Sanjay (F&B Head)',
      role: 'DEPARTMENT_MANAGER',
      organizationId: org.id,
      propertyId: property.id
    }
  });

  const keeperPassword = await bcrypt.hash('keeper123', 10);
  const keeper = await prisma.user.create({
    data: {
      email: 'keeper@hestia.com',
      password: keeperPassword,
      name: 'Ramesh (Storekeeper)',
      role: 'STOREKEEPER',
      organizationId: org.id,
      propertyId: property.id
    }
  });

  console.log('Created users: admin@hestia.com (admin123), chef@hestia.com (chef123), and keeper@hestia.com (keeper123).');

  // 5. Create Catalog Items
  const oil = await prisma.inventoryItem.create({
    data: {
      name: 'Premium Extra Virgin Olive Oil',
      category: 'F&B',
      subcategory: 'Groceries',
      sku: 'SKU-OIL-EV-001',
      isConsumable: true,
      purchaseUnit: 'Carton',
      consumptionUnit: 'ml',
      factor: 12000.0, // 1 Carton = 12 Bottles * 1000ml = 12000 ml
      organizationId: org.id
    }
  });

  const rice = await prisma.inventoryItem.create({
    data: {
      name: 'Premium Basmati Rice',
      category: 'F&B',
      subcategory: 'Groceries',
      sku: 'SKU-RICE-BS-002',
      isConsumable: true,
      purchaseUnit: 'Sack',
      consumptionUnit: 'Kg',
      factor: 25.0, // 1 Sack = 25 Kg
      organizationId: org.id
    }
  });

  const chicken = await prisma.inventoryItem.create({
    data: {
      name: 'Fresh Chicken Breast',
      category: 'F&B',
      subcategory: 'Meats',
      sku: 'SKU-MEAT-CH-003',
      isConsumable: true,
      purchaseUnit: 'Case',
      consumptionUnit: 'Kg',
      factor: 10.0, // 1 Case = 10 Kg
      organizationId: org.id
    }
  });

  const soap = await prisma.inventoryItem.create({
    data: {
      name: 'Luxury Mini Soap Bars 15g',
      category: 'Housekeeping',
      subcategory: 'Toiletries',
      sku: 'SKU-HK-SOAP-004',
      isConsumable: true,
      purchaseUnit: 'Box',
      consumptionUnit: 'Piece',
      factor: 200.0, // 1 Box = 200 mini soaps
      organizationId: org.id
    }
  });

  const bulb = await prisma.inventoryItem.create({
    data: {
      name: 'LED Filament Bulb 9W E27',
      category: 'Maintenance',
      subcategory: 'Electrical',
      sku: 'SKU-MAINT-BULB-005',
      isConsumable: true,
      purchaseUnit: 'Packet',
      consumptionUnit: 'Piece',
      factor: 10.0, // 1 Packet = 10 Bulbs
      organizationId: org.id
    }
  });

  console.log('Created catalog items.');

  // 6. Create Store Locations
  const warehouse = await prisma.store.create({
    data: {
      name: 'Central Warehouse',
      propertyId: property.id
    }
  });

  const kitchen = await prisma.store.create({
    data: {
      name: 'Main Kitchen Store',
      propertyId: property.id
    }
  });

  const hkFloor1 = await prisma.store.create({
    data: {
      name: 'Housekeeping Closet Floor 1',
      propertyId: property.id
    }
  });

  console.log('Created store locations.');

  // 7. Initialize Stock Balances
  // Premium Olive Oil: Low Stock (2000 ml vs 5000 ml min)
  await prisma.stockBalance.create({
    data: {
      itemId: oil.id,
      storeId: kitchen.id,
      quantity: 2000.0,
      minStockLevel: 5000.0,
      avgCostPrice: 0.32 // ₹3800 per carton of 12000ml = ₹0.316 per ml
    }
  });

  // Basmati Rice: Low Stock (10 Kg vs 50 Kg min)
  await prisma.stockBalance.create({
    data: {
      itemId: rice.id,
      storeId: kitchen.id,
      quantity: 10.0,
      minStockLevel: 50.0,
      avgCostPrice: 112.0 // ₹2800 per sack of 25kg = ₹112 per kg
    }
  });

  // Fresh Chicken: Good Stock (80 Kg vs 15 Kg min)
  await prisma.stockBalance.create({
    data: {
      itemId: chicken.id,
      storeId: kitchen.id,
      quantity: 80.0,
      minStockLevel: 15.0,
      avgCostPrice: 220.0 // ₹2200 per case of 10kg = ₹220 per kg
    }
  });

  // Luxury Mini Soap: Good Stock (300 Pieces vs 100 Pieces min)
  await prisma.stockBalance.create({
    data: {
      itemId: soap.id,
      storeId: hkFloor1.id,
      quantity: 300.0,
      minStockLevel: 100.0,
      avgCostPrice: 13.5 // ₹2700 per box of 200 = ₹13.5 per piece
    }
  });

  // LED Bulbs: Low Stock (2 Pieces vs 15 Pieces min)
  await prisma.stockBalance.create({
    data: {
      itemId: bulb.id,
      storeId: warehouse.id,
      quantity: 2.0,
      minStockLevel: 15.0,
      avgCostPrice: 80.0 // ₹800 per packet of 10 = ₹80 per bulb
    }
  });

  console.log('Initialized stock balances.');

  // 8. Create Vendors
  const foodVendor = await prisma.vendor.create({
    data: {
      name: 'Goa Food & Provisions Distributors',
      email: 'orders@goaprovisions.com',
      phone: '+91 8322411122',
      gstin: '30AAAAA1111A1Z1',
      address: 'Industrial Estate, Corlim, Goa - 403110',
      organizationId: org.id
    }
  });

  const amenitiesVendor = await prisma.vendor.create({
    data: {
      name: 'Linen, Amenity & Lighting Solutions Ltd.',
      email: 'sales@luxuryhotelamenities.com',
      phone: '+91 2248559090',
      gstin: '27BBBBB2222B2Z2',
      address: 'Midc Industrial Area, Andheri East, Mumbai - 400069',
      organizationId: org.id
    }
  });

  console.log('Created vendors.');

  // 9. Create Purchase Orders
  // PO 1: DRAFT
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0001',
      vendorId: foodVendor.id,
      propertyId: property.id,
      storeId: kitchen.id,
      status: 'DRAFT',
      totalAmount: 19000.0, // 5 Cartons * 3800
      createdById: admin.id,
      items: {
        create: [
          {
            itemId: oil.id,
            purchaseUnit: 'Carton',
            orderQty: 5.0,
            unitPrice: 3800.0,
            receivedQty: 0.0
          }
        ]
      }
    }
  });

  // PO 2: PENDING APPROVAL (Total: ₹45,600 > 25,000 Dept limit)
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0002',
      vendorId: foodVendor.id,
      propertyId: property.id,
      storeId: kitchen.id,
      status: 'PENDING_APPROVAL',
      totalAmount: 45600.0, // 10 sacks * 2800 = 28000 + 8 cases * 2200 = 17600
      createdById: chef.id,
      items: {
        create: [
          {
            itemId: rice.id,
            purchaseUnit: 'Sack',
            orderQty: 10.0,
            unitPrice: 2800.0,
            receivedQty: 0.0
          },
          {
            itemId: chicken.id,
            purchaseUnit: 'Case',
            orderQty: 8.0,
            unitPrice: 2200.0,
            receivedQty: 0.0
          }
        ]
      }
    }
  });

  // PO 3: APPROVED
  const approvedPO = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0003',
      vendorId: amenitiesVendor.id,
      propertyId: property.id,
      storeId: warehouse.id,
      status: 'APPROVED',
      totalAmount: 4000.0, // 5 packets * 800
      createdById: admin.id,
      approvedById: admin.id,
      items: {
        create: [
          {
            itemId: bulb.id,
            purchaseUnit: 'Packet',
            orderQty: 5.0,
            unitPrice: 800.0,
            receivedQty: 0.0
          }
        ]
      }
    }
  });

  // PO 4: COMPLETED with a GRN
  const completedPO = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0004',
      vendorId: amenitiesVendor.id,
      propertyId: property.id,
      storeId: hkFloor1.id,
      status: 'COMPLETED',
      totalAmount: 8100.0, // 3 Boxes * 2700
      createdById: admin.id,
      approvedById: admin.id,
      items: {
        create: [
          {
            itemId: soap.id,
            purchaseUnit: 'Box',
            orderQty: 3.0,
            unitPrice: 2700.0,
            receivedQty: 3.0 // fully received
          }
        ]
      }
    }
  });

  // Create Goods Received Note for PO 4
  const grn = await prisma.goodsReceivedNote.create({
    data: {
      grnNumber: 'GRN-2026-0001',
      poId: completedPO.id,
      receivedById: admin.id,
      items: {
        create: [
          {
            itemId: soap.id,
            receivedQty: 3.0,
            rejectedQty: 0.0,
            unitPrice: 2700.0,
            remarks: 'All packages arrived clean and sealed.'
          }
        ]
      }
    }
  });

  console.log('Created test Purchase Orders and GRNs.');

  // 10. Module 3 Seeding: Recipes and Clean templates
  console.log('Seeding recipes and clean checklists...');
  
  const butterChicken = await prisma.recipe.create({
    data: {
      name: 'Butter Chicken Rice Bowl',
      code: 'REC-BUTTER-CHICKEN',
      organizationId: org.id,
      ingredients: {
        create: [
          { itemId: chicken.id, quantity: 0.25 }, // 250g Chicken
          { itemId: oil.id, quantity: 20.0 },     // 20ml Oil
          { itemId: rice.id, quantity: 0.2 }      // 200g Rice
        ]
      }
    }
  });

  const oilSalad = await prisma.recipe.create({
    data: {
      name: 'Mediterranean Garden Salad',
      code: 'REC-GARDEN-SALAD',
      organizationId: org.id,
      ingredients: {
        create: [
          { itemId: oil.id, quantity: 15.0 } // 15ml Oil
        ]
      }
    }
  });

  // Clean checklists
  await prisma.cleanChecklist.create({
    data: {
      cleanType: 'FULL_CLEAN',
      itemId: soap.id,
      quantity: 2.0, // Consumes 2 soaps
      organizationId: org.id
    }
  });

  await prisma.cleanChecklist.create({
    data: {
      cleanType: 'CHECKOUT_CLEAN',
      itemId: soap.id,
      quantity: 4.0, // Consumes 4 soaps
      organizationId: org.id
    }
  });

  // Seed Stock Transactions (Receipts matching current StockBalances)
  console.log('Seeding initial stock transactions ledger entries...');
  const balances = [
    { itemId: oil.id, storeId: kitchen.id, qty: 2000.0, cost: 0.32, remark: 'Opening stock count' },
    { itemId: rice.id, storeId: kitchen.id, qty: 10.0, cost: 112.0, remark: 'Opening stock count' },
    { itemId: chicken.id, storeId: kitchen.id, qty: 80.0, cost: 220.0, remark: 'Opening stock count' },
    { itemId: soap.id, storeId: hkFloor1.id, qty: 300.0, cost: 13.5, remark: 'GRN-2026-0001 initial receipt' },
    { itemId: bulb.id, storeId: warehouse.id, qty: 2.0, cost: 80.0, remark: 'Opening stock count' }
  ];

  for (const bal of balances) {
    await prisma.stockTransaction.create({
      data: {
        itemId: bal.itemId,
        storeId: bal.storeId,
        type: 'RECEIPT',
        quantity: bal.qty,
        costPrice: bal.cost,
        remarks: bal.remark,
        recordedById: admin.id
      }
    });
  }

  // Seed a sample wastage log and transaction
  const waste = await prisma.wastageLog.create({
    data: {
      itemId: rice.id,
      storeId: kitchen.id,
      quantity: 1.5, // 1.5 Kg wasted
      reason: 'SPOILED',
      remarks: 'Water damage during cleaning',
      recordedById: chef.id
    }
  });

  // Deduct from Stock Balance
  await prisma.stockBalance.updateMany({
    where: { itemId: rice.id, storeId: kitchen.id },
    data: { quantity: { decrement: 1.5 } }
  });

  // Log in ledger
  await prisma.stockTransaction.create({
    data: {
      itemId: rice.id,
      storeId: kitchen.id,
      type: 'WASTAGE',
      quantity: -1.5,
      costPrice: 112.0,
      referenceId: waste.id,
      remarks: 'Spoiled - Water damage during cleaning',
      recordedById: chef.id
    }
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
