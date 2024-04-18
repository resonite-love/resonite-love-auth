import {Autocomplete, Avatar, Box, Grid, TextField, Typography} from "@mui/material";
import {useEffect, useRef, useState} from "react";
import {getResoniteUserByUserId, searchResoniteUser} from "../api.ts";
import {useTranslation} from "../contexts/Translation.tsx";
import {parseResDB, ResoniteUser} from "../lib/share.ts";

function LocationOnIcon(props: { sx: { color: string } }) {
  return null;
}




export type UserSearchProps = {
  defaultUserId?: string
  setUserId?: (userId: string) => void
}

export const UserSearch = ({setUserId, defaultUserId} : UserSearchProps) => {
  const [value, setValue] = useState<ResoniteUser | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<readonly ResoniteUser[]>([]);
  // const loaded = useRef(false);

  const {t} = useTranslation()

  useEffect(() => {
    if (defaultUserId) {
      getResoniteUserByUserId(defaultUserId).then((res) => {
        setValue(res)
        setUserId && setUserId(res.id)
      })
    }
  }, [defaultUserId])


  useEffect(() => {
    let active = true;

    if (inputValue === '') {
      setOptions(value ? [value] : []);
      return undefined;
    }

    searchResoniteUser(inputValue).then((res) => {
      if (active) {
        console.log(res)
        setOptions(res);
      }
    })

    return () => {
      active = false;
    };
  }, [value, inputValue, fetch]);

  useEffect(() => {
    if (value) {
      setUserId && setUserId(value.id)
    }
  }, [value]);

  return (
    <Autocomplete
      id="google-map-demo"
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option.username
      }
      filterOptions={(x) => x}
      options={options}
      autoComplete
      includeInputInList
      filterSelectedOptions
      popupIcon={null}
      value={value}
      noOptionsText={t.noUserFound}
      onChange={(event: any, newValue: ResoniteUser | null) => {
        setOptions(newValue ? [newValue, ...options] : options);
        setValue(newValue);
      }}
      isOptionEqualToValue={(option, newValue) => {
        return option.id === newValue.id;
      }}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField {...params} label={t.userPlaceholder} fullWidth/>
      )}
      renderOption={(props, option) => {
        console.log(option)

        return (
          <li {...props}>
            <Grid container alignItems="center">
              <Grid item sx={{display: 'flex', width: 44}}>
                <LocationOnIcon sx={{color: 'text.secondary'}}/>
                <Avatar sx={{width: 32, height: 32}} src={option.profile?.iconUrl ? parseResDB(option.profile.iconUrl) : ""}/>
              </Grid>
              <Grid item sx={{width: 'calc(100% - 44px)', wordWrap: 'break-word'}}>
                <Typography noWrap>{option.username}</Typography>
                <Typography noWrap variant={"subtitle2"}>{option.id}</Typography>
              </Grid>
            </Grid>
          </li>
        );
      }}
    />
  )
}

export default UserSearch