export http_proxy=http://10.158.100.3:8080
export https_proxy=http://10.158.100.3:8080
export GH_TOKEN=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
yarn run build --prod && nx run electron:make --platform windows --arch x64 --publishPolicy always