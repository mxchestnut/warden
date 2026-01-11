# GitHub Actions Deployment Setup

## GitHub Secrets Required

You need to add these secrets to your GitHub repository:

### Steps:
1. Go to https://github.com/mxchestnut/warden/settings/secrets/actions
2. Click "New repository secret" for each of the following:

### Secret 1: AWS_HOST
```
54.235.52.122
```

### Secret 2: AWS_USERNAME
```
ec2-user
```

### Secret 3: AWS_SSH_KEY
Copy the ENTIRE contents of your SSH key (including BEGIN/END lines):
```
Run this command to copy it:
cat ~/.ssh/warden-key-2026.pem | pbcopy
```

Then paste it into the GitHub secret value field.

---

## After Adding Secrets

Once all three secrets are added, any push to the `main` branch will automatically:
1. Pull the latest code on your AWS server
2. Install dependencies
3. Build the backend
4. Restart the server with PM2

You can monitor deployments at:
https://github.com/mxchestnut/warden/actions

---

## Testing the Workflow

After setting up secrets, commit and push the workflow file:
```bash
git add .github/workflows/deploy.yml
git commit -m "Add automated deployment workflow"
git push
```

The deployment will run automatically!
