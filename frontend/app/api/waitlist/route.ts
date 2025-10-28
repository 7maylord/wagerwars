import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Email recorded (database not configured)',
          email: email 
        },
        { status: 200 }
      )
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email)
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'You\'re already on our waitlist! We\'ll keep you updated.',
          alreadyRegistered: true
        },
        { status: 200 }
      )
    }

    // Insert new email into database
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        { 
          email, 
          created_at: new Date().toISOString(),
          source: 'website',
          email_sent: false,
          email_id: null
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save email to database' },
        { status: 500 }
      )
    }

    // Get total count
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    // Send welcome email if Resend is configured
    let emailSent = false
    if (resend) {
      try {
        const emailData = await resend.emails.send({
          from: 'WagerWars <noreply@wagerwars.paytroix.xyz>',
          to: [email],
          subject: '🎯 You\'re In! Welcome to WagerWars',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to WagerWars</title>
              <style>
                body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background: linear-gradient(135deg, #000000 0%, #0a0e27 100%);
                }
                .container {
                  background: #0a0e27;
                  border-radius: 12px;
                  padding: 40px;
                  border: 1px solid #00ffff;
                  box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .logo {
                  font-size: 32px;
                  font-weight: bold;
                  color: #00ffff;
                  margin-bottom: 10px;
                }
                .title {
                  font-size: 28px;
                  font-weight: bold;
                  color: #ffffff;
                  margin-bottom: 20px;
                }
                .subtitle {
                  font-size: 18px;
                  color: #8b92b0;
                  margin-bottom: 30px;
                }
                .content {
                  color: #ffffff;
                  font-size: 16px;
                  line-height: 1.8;
                }
                .highlight {
                  color: #00ffff;
                  font-weight: bold;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #1a1f3a;
                  text-align: center;
                  color: #8b92b0;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">⚔️ WagerWars</div>
                  <h1 class="title">You're In! 🎯</h1>
                  <p class="subtitle">We're cooking and can't wait for you to get served</p>
                </div>
                
                <div class="content">
                  <p>Hey Warrior! 👋</p>
                  
                  <p>Welcome to the <span class="highlight">WagerWars</span> revolution! You've successfully joined our elite waitlist of early adopters who will shape the future of decentralized wagering.</p>
                  
                  <p>We're building something <span class="highlight">epic</span> and you're going to be among the first to experience it. Our team is working around the clock to bring you the most innovative wagering platform on the blockchain.</p>
                  
                  <p><strong>What happens next?</strong></p>
                  <p>• You'll receive exclusive updates as we build<br>
                  • Early access invitations will be sent to this email<br>
                  • Special rewards for our founding warriors<br>
                  • Direct communication channel with our team</p>
                  
                  <p>Stay tuned, stay ready, and get ready to <span class="highlight">wage war</span> like never before! 🔥</p>
                  
                  <p>Best regards,<br>
                  The WagerWars Team ⚔️</p>
                </div>
                
                <div class="footer">
                  <p>Powered by <strong>Stacks</strong> </p>
                  <p>This email was sent to ${email} because you joined our waitlist.</p>
                  <p>If you didn't sign up, you can safely ignore this email.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        })
        
        emailSent = true
        
        // Update the database record with email status
        await supabase
          .from('waitlist')
          .update({ email_sent: true, email_id: emailData.data?.id })
          .eq('email', email)
          
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: emailSent ? 'Email added to waitlist and welcome email sent!' : 'Email added to waitlist',
        total: count,
        emailSent
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'Failed to process waitlist signup' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for admin API key in headers
    const adminKey = request.headers.get('x-admin-key')
    const expectedAdminKey = process.env.ADMIN_API_KEY
    
    if (!expectedAdminKey) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 501 }
      )
    }
    
    if (!adminKey || adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data, error, count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch emails' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      emails: data,
      total: count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}