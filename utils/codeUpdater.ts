import supabase from './supabaseClient';

// Generate a 4-digit random code
const generateCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
};

// Update the code in the database every 2 seconds
export const updateOrderCode = async (orderId: number) => {
  const code = generateCode();
  const { error } = await supabase
    .from('inventory_requests')
    .update({ code })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating code:', error);
  }
};

// Set an interval to update the code every 2 seconds
export const startCodeUpdater = (orderId: number) => {
  const interval = setInterval(() => {
    updateOrderCode(orderId);
  }, 30000); // Update code every 2 seconds

  return () => clearInterval(interval); // Return a cleanup function to clear the interval
};
