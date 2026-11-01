import { HelpCircle, Mail, MessageSquare, FileText, Shield, Bell, AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Button } from "./ui/button";
import questionMarkIcon from "figma:asset/fb3205e6fb4e4daddeda8af95780687a7eb1dd8a.png";

export function HelpSupportView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <img 
          src={questionMarkIcon} 
          alt="Help" 
          className="h-16 w-16 mx-auto object-contain"
        />
        <h1 className="text-xl font-semibold leading-7 text-white">Help & Support</h1>
        <p className="text-muted-text">Find answers to common questions and get support</p>
      </div>

      {/* Quick Help Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-surface border-rule p-6 hover:bg-raised transition-colors">
          <div className="flex items-start gap-4">
            <div className="bg-flame-tint p-3 rounded-lg">
              <MessageSquare className="h-6 w-6 text-flame" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white">Contact Support</h3>
              <p className="text-sm text-muted-text">Get help from our support team</p>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-raised border-rule hover:bg-raised text-white"
              >
                Send Message
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-surface border-rule p-6 hover:bg-raised transition-colors">
          <div className="flex items-start gap-4">
            <div className="bg-raised p-3 rounded-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white">Email Us</h3>
              <p className="text-sm text-muted-text">support@streakz.app</p>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-raised border-rule hover:bg-raised text-white"
                onClick={() => window.location.href = 'mailto:support@streakz.app'}
              >
                Send Email
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card className="bg-surface border-rule p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-flame" />
          <h2 className="text-base font-semibold text-white">Frequently Asked Questions</h2>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="item-1" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              What is Streakz?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              Streakz is a next-generation social media platform that lets you share, track, and celebrate your winning streaks across categories like gaming, gambling, fitness, hobbies, and personal goals. Connect with others, compete on leaderboards, and stay motivated!
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              How do I create a streak?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              Click the "+" button in the top navigation bar, select "New Streak", choose a category, add your streak count, title, description, and upload an image or video. Your streak will appear on your profile and in the feed!
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              What is a parent-child streak system?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              Instead of creating 365 separate posts for a year-long streak, you can create one parent streak and add daily updates to it as an album. Users can swipe through your progress, keeping your profile clean and organized while showcasing your journey.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              How do I add to an existing streak?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              Click the "+" button, select "Continue Streak", choose which streak you want to add to, upload your new content and description. Your streak count will automatically increment and the new day will be added to the streak album.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              How does the Arena work?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              The Arena is an Instagram-style gallery view where you can explore trending streaks from the community. Swipe through posts, like and comment, and discover inspiring streaks from users around the platform.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              How are leaderboard rankings calculated?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              Leaderboard rankings are based on your total streak score, which combines your longest streak, total number of streaks, and active streaks. The more consistent you are and the longer your streaks, the higher you'll rank!
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-7" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              How do achievements work?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              Achievements are unlocked automatically based on your activity! Reach milestones like "First Streak", "10 Day Streak", "30 Day Warrior", "Triple Threat" (3 active streaks), and more. Check your profile to see all unlocked achievements.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-8" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              Can I tag other users in my posts?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              Yes! Use the "@" symbol followed by a username when creating a post, comment, or sending a message. You'll see autocomplete suggestions as you type. Tagged users will be notified and can click the tag to view the mentioned user's profile.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-9" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              How do I delete a message?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              You can unsend messages within 10 minutes of sending them. Hover over your message to see the trash icon appear. After 10 minutes, messages become permanent.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-10" className="border-rule">
            <AccordionTrigger className="text-white hover:text-flame">
              Is my profile public or private?
            </AccordionTrigger>
            <AccordionContent className="text-muted-text">
              By default, profiles are public and visible to all Streakz users. You can change this in your profile settings by editing your profile and toggling the public/private option.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Community Guidelines */}
      <Card className="bg-surface border-rule p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-flame" />
          <h2 className="text-base font-semibold text-white">Community Guidelines</h2>
        </div>

        <div className="space-y-3 text-muted-text text-sm">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
            <p>Be respectful and supportive of other users' streaks and achievements</p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
            <p>Share authentic content and genuine progress</p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-positive flex-shrink-0 mt-0.5" />
            <p>Encourage and motivate others in their journeys</p>
          </div>
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p>Do not spam, harass, or post offensive content</p>
          </div>
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p>Do not impersonate other users or share false information</p>
          </div>
        </div>
      </Card>

      {/* Platform Features */}
      <Card className="bg-surface border-rule p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-flame" />
          <h2 className="text-base font-semibold text-white">Platform Features</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-white text-sm">Responsive Design</h3>
            <p className="text-muted-text text-xs">Works seamlessly on desktop, tablet, and mobile devices</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-white text-sm">Media Support</h3>
            <p className="text-muted-text text-xs">Upload images and videos to showcase your streaks</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-white text-sm">Real-time Messaging</h3>
            <p className="text-muted-text text-xs">Connect with others through instant messages</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-white text-sm">Achievements System</h3>
            <p className="text-muted-text text-xs">Unlock badges and rewards as you reach milestones</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-white text-sm">Leaderboards</h3>
            <p className="text-muted-text text-xs">Compete with the community and track your ranking</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-white text-sm">Category Filters</h3>
            <p className="text-muted-text text-xs">Browse streaks by Gaming, Fitness, Goals, Hobbies, and more</p>
          </div>
        </div>
      </Card>

      {/* Still Need Help */}
      <Card className="bg-raised border-rule p-6 text-center">
        <h3 className="text-white mb-2">Still need help?</h3>
        <p className="text-muted-text text-sm mb-4">
          Our support team is here to assist you with any questions or issues.
        </p>
        <Button 
          className="bg-white text-black hover:bg-[#e6e3df]"
          onClick={() => window.location.href = 'mailto:support@streakz.app'}
        >
          <Mail className="h-4 w-4 mr-2" />
          Contact Support
        </Button>
      </Card>
    </div>
  );
}
