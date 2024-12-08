import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { startCodeUpdater } from '../../utils/codeUpdater'; // Import the code updater utility
import supabase from '../../utils/supabaseClient';

interface Driver {
  id: string;
  name: string;
  contact_info: string;
  status: string;
  created_at: string;
}

interface InventoryRequest {
  id: number;
  quantity: number;
  unit: string;
  status: string;
  notes: string;
  driver_accepted: boolean;
  accepted_driver_id: string | null;
  code: string; // Adding code field
  items: { name: string } | null; // Item details
  restaurants: { name: string } | null; // Restaurant details
  created_at: string;
}

const DriverDetails: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [driver, setDriver] = useState<Driver | null>(null);
  const [pendingOrders, setPendingOrders] = useState<InventoryRequest[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');

  useEffect(() => {
    if (id) {
      fetchDriverDetails(id as string);
      fetchOrders(id as string);
      const orderSubscription = subscribeToOrders();

      // Cleanup subscription on component unmount
      return () => {
        orderSubscription.unsubscribe();
      };
    }
  }, [id]);

  useEffect(() => {
    // Start the code updater for each accepted order
    const cleanupFunctions = acceptedOrders.map(order =>
      startCodeUpdater(order.id) // Updated to pass only the `order.id`
    );

    // Cleanup the interval when component unmounts
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [acceptedOrders]);

  // Fetch driver details
  const fetchDriverDetails = async (driverId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (error) {
      console.error('Error fetching driver details:', error);
    } else {
      setDriver(data);
    }
    setLoading(false);
  };

  const fetchOrders = async (driverId: string) => {
    const { data, error } = await supabase
      .from('inventory_requests')
      .select(`
        *,
        items (name),
        restaurants (name)
      `)
      .eq('called_driver', true);

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      const pending = data.filter(
        (order: InventoryRequest) =>
          !order.driver_accepted || order.accepted_driver_id === null
      ); // Orders that have not been accepted by any driver

      const accepted = data.filter(
        (order: InventoryRequest) => order.accepted_driver_id === driverId
      ); // Orders accepted by the current driver

      setPendingOrders(pending);
      setAcceptedOrders(accepted);
    }
  };

  // Handle accept order and update accepted_driver_id
  const handleAcceptOrder = async (orderId: number) => {
    const { error } = await supabase
      .from('inventory_requests')
      .update({ driver_accepted: true, accepted_driver_id: id }) // Track which driver accepted
      .eq('id', orderId);

    if (error) {
      console.error('Error accepting order:', error);
    } else {
      fetchOrders(id as string); // Refetch orders to update UI
    }
  };

  // Handle reject order
  const handleRejectOrder = async (orderId: number) => {
    const { error } = await supabase
      .from('inventory_requests')
      .update({ driver_accepted: false, accepted_driver_id: null }) // Ensure the driver ID is cleared
      .eq('id', orderId);

    if (error) {
      console.error('Error rejecting order:', error);
    } else {
      fetchOrders(id as string); // Refetch orders to update UI
    }
  };

  // Subscribe to real-time updates on inventory_requests
  const subscribeToOrders = () => {
    const channel = supabase
      .channel('inventory_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_requests',
          filter: 'called_driver=eq.true',
        },
        (payload) => {
          console.log('Real-time event:', payload);
          fetchOrders(id as string); // Refetch orders on real-time event
        }
      )
      .subscribe();

    return channel;
  };

  // Function to toggle between the Pending and Accepted tabs
  const switchTab = (tab: 'pending' | 'accepted') => {
    setActiveTab(tab);
  };

  if (loading) return <p>Loading...</p>;
  if (!driver) return <p>Driver not found.</p>;

  return (
    <div className="main-container">
      {/* Logo at the top */}
      <img src="/logo.png" alt="Logo" className="logo" />

      <h1 className="text-3xl font-bold mb-4">Welcome {driver.name}</h1>

      {/* Tab Buttons */}
      <div className="tab-buttons">
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => switchTab('pending')}
        >
          Pending Orders
        </button>
        <button
          className={`tab-button ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => switchTab('accepted')}
        >
          Accepted Orders
        </button>
      </div>

      {/* Display Pending Orders */}
      {activeTab === 'pending' && (
        <section className="orders-section">
          <h2 className="section-title">Pending Orders</h2>
          <div className="orders-scroll">
            {pendingOrders.length === 0 ? (
              <p className="text-center text-gray-600">No pending orders.</p>
            ) : (
              pendingOrders.map((order) => (
                <div key={order.id} className="order-container pending">
                  <p className="mb-2">
                    <strong>Item Ordered:</strong> {order.items?.name || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <strong>Restaurant Name:</strong> {order.restaurants?.name || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <strong>Quantity:</strong> {order.quantity} {order.unit}
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong> {order.status}
                  </p>
                  <p className="mb-4">
                    <strong>Notes:</strong> {order.notes || 'No notes available.'}
                  </p>
                  <div className="button-group">
                    <button className="btn-success" onClick={() => handleAcceptOrder(order.id)}>
                      Accept
                    </button>
                    <button className="btn-danger" onClick={() => handleRejectOrder(order.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Display Accepted Orders */}
      {activeTab === 'accepted' && (
        <section className="orders-section">
          <h2 className="section-title">Accepted Orders</h2>
          <div className="orders-scroll">
            {acceptedOrders.length === 0 ? (
              <p className="text-center text-gray-600">No accepted orders.</p>
            ) : (
              acceptedOrders.map((order) => (
                <div key={order.id} className="order-container accepted">
                  <p className="mb-2">
                    <strong>Item Ordered:</strong> {order.items?.name || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <strong>Restaurant Name:</strong> {order.restaurants?.name || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <strong>Quantity:</strong> {order.quantity} {order.unit}
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong> {order.status}
                  </p>
                  <p className="mb-4">
                    <strong>Notes:</strong> {order.notes || 'No notes available.'}
                  </p>
                  <p className="mb-4 text-green-600">
                    <strong>Current Code:</strong> {order.code} {/* Display the updated code */}
                  </p>
                  <p className="mb-4 text-green-600">
                    <strong>Accepted by Driver:</strong> {driver.name}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default DriverDetails;
