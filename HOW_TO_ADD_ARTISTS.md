
# How to Add Afroman and OG Daddy V to Your Artists Tab

## Quick Method (Recommended)

I've created a special helper screen that makes it super easy to add both artists with one click!

### Steps:

1. **Sign in as Admin**
   - Go to the Admin tab in your app
   - Sign in with your admin credentials

2. **Use the Quick Add Button**
   - In the Admin panel, you'll see a button at the top: **"Quick Add: Afroman & OG Daddy V"**
   - Tap this button
   - You'll be taken to a helper screen showing previews of both artists

3. **Add the Artists**
   - You can add both artists at once by tapping **"Add Both Artists"**
   - Or add them individually with the buttons under each artist preview

4. **View the Results**
   - After adding, go to the Artists tab to see the new artist profiles
   - Both artists will appear with their complete bios, specialties, status, and label information

## What Gets Added

### Afroman
- **Name:** Afroman
- **Status:** Active
- **Label:** Hungry Hustler Records
- **Specialties:** Recording Artist, Songwriter, Performer, Cultural Icon
- **Bio:** Full Grammy-nominated artist bio (as provided)

### OG Daddy V
- **Name:** OG Daddy V
- **Status:** Active
- **Label:** Hungry Hustler Records
- **Specialties:** Recording Artist, Songwriter, Performer
- **Bio:** Full emerging artist bio (as provided)

## Manual Method (Alternative)

If you prefer to add artists manually or want to customize the information:

1. Go to the Admin tab
2. Tap "Add New Artist"
3. Fill in the form with:
   - Name
   - Bio (copy from the provided text)
   - Specialties (as JSON array): `["Recording Artist","Songwriter","Performer"]`
   - Status: `Active`
   - Label: `Hungry Hustler Records`
   - Add photo URLs and social media links as needed
4. Tap "Save"

## Adding Photos and Social Links

After adding the artists, you can edit them to add:
- Photo URLs
- Spotify links
- Apple Music links
- YouTube links
- SoundCloud links
- Instagram links
- Twitter links

Just go to the Admin panel, find the artist, tap "Edit", and fill in the additional fields.

## Troubleshooting

**"Access Denied" error:**
- Make sure you're signed in with an admin account
- If you haven't set up an admin yet, go to the Admin Setup screen first

**Artists not showing up:**
- Refresh the Artists tab by pulling down to reload
- Check that the artists were saved successfully (you should see a success message)

**Need to edit artist information:**
- Go to Admin panel → Artists tab
- Find the artist and tap "Edit"
- Make your changes and tap "Save"

## Notes

- The helper screen is accessible from the Admin panel
- All artist data is stored in the backend database
- Changes appear immediately in the Artists tab
- You can edit or delete artists anytime from the Admin panel
