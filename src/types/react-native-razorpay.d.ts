/** react-native-razorpay@3.0.0 ships no types: the part of Checkout the app uses. */
declare module 'react-native-razorpay' {
  export interface CheckoutOptions {
    key: string
    order_id: string
    amount: number
    currency: string
    name: string
    description?: string
    customer_id?: string
    prefill?: { name?: string; contact?: string; email?: string }
    notes?: Record<string, string>
    theme?: { color?: string }
  }
  export interface CheckoutSuccess {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }
  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<CheckoutSuccess>
  }
  export default RazorpayCheckout
}
